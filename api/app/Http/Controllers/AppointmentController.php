<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Role;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\Notification;
use App\Services\Sms\SmsGateway;
use App\Support\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * সাক্ষাৎকার (§8.3). Citizens request a UNO appointment (with a proposed time); the UNO accepts —
 * confirming or modifying that time, which puts it on the UNO's calendar — or rejects. Either way
 * the request is decided (done) and the citizen is notified by SMS (+ email if on file).
 * Tenant-scoped.
 */
class AppointmentController extends Controller
{
    public function __construct(private SmsGateway $sms) {}

    /** List with সকল / অপেক্ষমান / অনুমোদিত / নাকচ tabs, counts, search. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenant();

        $base = Appointment::query()
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('applicant_name', 'like', "%{$q}%")
                ->orWhere('purpose', 'like', "%{$q}%")));

        $status = $request->query('status', 'all');
        $statuses = ['pending', 'approved', 'rejected'];

        $list = (clone $base)
            ->when(in_array($status, $statuses, true), fn ($b) => $b->where('status', $status))
            ->with('union')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => AppointmentResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => collect(['all', 'pending', 'approved', 'rejected'])
                ->map(fn ($key) => [
                    'key' => $key,
                    'total' => $key === 'all' ? (clone $base)->count() : (clone $base)->where('status', $key)->count(),
                ])->all(),
        ]);
    }

    public function show(Appointment $appointment): AppointmentResource
    {
        return new AppointmentResource($appointment->load('union', 'citizen'));
    }

    /** Request an appointment (citizen, or officer on behalf). */
    public function store(Request $request): AppointmentResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'applicant_name' => ['required', 'string', 'max:120'],
            'purpose' => ['required', 'string', 'max:180'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address' => ['nullable', 'string', 'max:255'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],
            'description' => ['nullable', 'string'],
            'appointment_date' => ['nullable', 'date'],
            'appointment_time' => ['nullable', 'date_format:H:i'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        // Idempotent create for the offline PWA: a retried submit with the same client_uuid returns
        // the already-created appointment instead of duplicating it.
        if (! empty($data['client_uuid'])) {
            $existing = Appointment::where('client_uuid', $data['client_uuid'])->first();
            if ($existing) {
                return new AppointmentResource($existing->load('union'));
            }
        }

        $user = $request->user();
        $data['created_by'] = $user->id;
        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }
        $data['tracking_token'] = TrackingToken::generate('SUR-APT', 'appointments');

        $appointment = Appointment::create($data);

        // Notify the UNO of a new appointment request (§8.3).
        Notification::emit(
            'appointment',
            Role::UNO,
            'নতুন সাক্ষাৎকারের আবেদন',
            $appointment->purpose,
            '/appointment/'.$appointment->id,
        );

        return new AppointmentResource($appointment->load('union'));
    }

    /**
     * UNO: accept the request. The UNO may keep the citizen's proposed time or modify it to fit
     * the schedule; the confirmed date/time is what lands on the UNO calendar. Marks it done and
     * notifies the citizen.
     */
    public function approve(Request $request, Appointment $appointment): AppointmentResource
    {
        $data = $request->validate([
            'appointment_date' => ['nullable', 'date'],
            'appointment_time' => ['nullable', 'date_format:H:i'],
            'decision_note' => ['nullable', 'string'],
        ]);

        $appointment->fill([
            'status' => AppointmentStatus::APPROVED,
            'decided_at' => now(),
            'appointment_date' => $data['appointment_date'] ?? $appointment->appointment_date,
            'appointment_time' => $data['appointment_time'] ?? $appointment->appointment_time,
            'decision_note' => $data['decision_note'] ?? $appointment->decision_note,
        ])->save();

        $when = trim(($appointment->appointment_date?->toDateString() ?? '').' '.($appointment->appointment_time ?? ''));
        $message = 'সুরাহা: আপনার সাক্ষাৎকারের আবেদন অনুমোদিত হয়েছে।'
            .($when !== '' ? ' নির্ধারিত সময়: '.$when.'।' : '')
            .' স্থান: উপজেলা নির্বাহী কর্মকর্তার কার্যালয়।'
            .(($data['decision_note'] ?? null) ? ' মন্তব্য: '.$data['decision_note'] : '');
        $this->notifyCitizen($appointment, $message);

        return new AppointmentResource($appointment->load('union'));
    }

    /** UNO: reject the request. Marks it done and notifies the citizen with the reason. */
    public function reject(Request $request, Appointment $appointment): AppointmentResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string']]);

        $appointment->fill([
            'status' => AppointmentStatus::REJECTED,
            'decided_at' => now(),
            'decision_note' => $data['decision_note'] ?? $appointment->decision_note,
        ])->save();

        $message = 'সুরাহা: দুঃখিত, আপনার সাক্ষাৎকারের আবেদনটি নাকচ করা হয়েছে।'
            .(($data['decision_note'] ?? null) ? ' কারণ: '.$data['decision_note'] : '');
        $this->notifyCitizen($appointment, $message);

        return new AppointmentResource($appointment->load('union'));
    }

    /** The UNO's appointment calendar — approved appointments, ordered by date/time. */
    public function schedule(): JsonResponse
    {
        $this->requireTenant();

        $appointments = Appointment::query()
            ->where('status', AppointmentStatus::APPROVED)
            ->whereNotNull('appointment_date')
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->get(['id', 'applicant_name', 'purpose', 'appointment_date', 'appointment_time'])
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'applicant_name' => $a->applicant_name,
                'purpose' => $a->purpose,
                'appointment_date' => $a->appointment_date?->toDateString(),
                'appointment_time' => $a->appointment_time,
            ]);

        return response()->json(['appointments' => $appointments]);
    }

    /** Notify the citizen of the decision by SMS (to the request mobile) and email (if on file). */
    private function notifyCitizen(Appointment $appointment, string $message): void
    {
        $appointment->loadMissing('citizen');

        $phone = $appointment->mobile ?: $appointment->citizen?->phone;
        if ($phone) {
            $this->sms->send($phone, $message);
        }

        $email = $appointment->citizen?->email;
        if ($email) {
            Mail::raw($message, fn ($mail) => $mail->to($email)->subject('সুরাহা — সাক্ষাৎকারের আবেদন'));
        }
    }
}
