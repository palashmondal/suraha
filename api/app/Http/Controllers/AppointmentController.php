<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Role;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * সাক্ষাৎকার (§8.3). Citizens request a UNO appointment; the UNO approves / rejects / reschedules.
 * Tenant-scoped.
 */
class AppointmentController extends Controller
{
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
        ]);

        $user = $request->user();
        $data['created_by'] = $user->id;
        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }
        $data['tracking_token'] = \App\Support\TrackingToken::generate('SUR-APT', 'appointments');

        $appointment = Appointment::create($data);

        // Notify the UNO of a new appointment request (§8.3).
        \App\Models\Notification::emit(
            'appointment',
            Role::UNO,
            'নতুন সাক্ষাৎকারের আবেদন',
            $appointment->purpose,
            '/appointment/'.$appointment->id,
        );

        return new AppointmentResource($appointment->load('union'));
    }

    /** UNO: অনুমোদিত করুন. */
    public function approve(Request $request, Appointment $appointment): AppointmentResource
    {
        return $this->decide($request, $appointment, AppointmentStatus::APPROVED);
    }

    /** UNO: নাকচ করুন. */
    public function reject(Request $request, Appointment $appointment): AppointmentResource
    {
        return $this->decide($request, $appointment, AppointmentStatus::REJECTED);
    }

    /** UNO: নতুন তারিখ ও সময় নির্ধারণ করুন — reschedule; stays অপেক্ষমান. */
    public function reschedule(Request $request, Appointment $appointment): AppointmentResource
    {
        $data = $request->validate([
            'appointment_date' => ['required', 'date'],
            'appointment_time' => ['nullable', 'date_format:H:i'],
        ]);

        $appointment->fill([
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'] ?? $appointment->appointment_time,
            'status' => AppointmentStatus::PENDING,
            'decided_at' => null,
        ])->save();

        return new AppointmentResource($appointment->load('union'));
    }

    private function decide(Request $request, Appointment $appointment, AppointmentStatus $status): AppointmentResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string']]);

        $appointment->fill([
            'status' => $status,
            'decided_at' => now(),
            'decision_note' => $data['decision_note'] ?? $appointment->decision_note,
        ])->save();

        return new AppointmentResource($appointment->load('union'));
    }

    private function requireTenant(): void
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
    }
}
