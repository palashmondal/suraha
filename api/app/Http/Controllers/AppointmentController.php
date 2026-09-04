<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\Role;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Models\AppointmentNote;
use App\Models\Notification;
use App\Services\Sms\SmsGateway;
use App\Support\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
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
        $this->requireTenantForListing($request->user());

        $base = Appointment::query()
            // Only the columns the তালিকা actually shows, so every hit is visible in its row.
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('purpose', 'ilike', "%{$q}%")
                ->orWhere('description', 'ilike', "%{$q}%")));

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
        return new AppointmentResource($appointment->load('union', 'citizen', 'notes.author'));
    }

    /**
     * UNO: keep a dated note on this সাক্ষাৎকার — what came of the meeting, a follow-up
     * instruction, anything worth remembering. Notes accumulate; none of them replaces another,
     * and the citizen is not notified.
     */
    public function addNote(Request $request, Appointment $appointment): AppointmentResource
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $note = $appointment->notes()->make([
            'body' => $data['body'],
            'author_id' => $request->user()->id,
        ]);
        // A note belongs to its appointment's upazila — never to whatever tenancy the request
        // happens to have initialized. SEAL reads a detail page from the central "সকল উপজেলা"
        // view with no tenant resolved, where BelongsToTenant would leave tenant_id null.
        $note->tenant_id = $appointment->tenant_id;
        $note->save();

        return new AppointmentResource($appointment->load('union', 'citizen', 'notes.author'));
    }

    /**
     * UNO: drop a note written in error. Bound to its own appointment, so a note id belonging to
     * another সাক্ষাৎকার cannot be deleted through this one.
     */
    public function deleteNote(Appointment $appointment, AppointmentNote $note): AppointmentResource
    {
        abort_unless($note->appointment_id === $appointment->id, 404);

        $note->delete();

        return new AppointmentResource($appointment->load('union', 'citizen', 'notes.author'));
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
            .' স্থান: '.$appointment->officeBn().'।'
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

        return response()->json([
            'appointments' => $appointments,
            // Paste into Google Calendar → Other calendars → From URL (§8.3, optional).
            'feed_url' => url('/api/appointments/calendar.ics?t='.self::feedToken(tenant()->id)),
        ]);
    }

    /**
     * The same schedule as an iCalendar feed, so the UNO can subscribe to it from Google Calendar
     * (Other calendars → From URL) without any Google account linking on our side. Unauthenticated
     * — Google cannot send a Bearer token — so the URL itself is the secret: a per-upazila HMAC of
     * the tenant id. Read-only and one-way.
     */
    public function calendarFeed(Request $request): Response
    {
        $tenant = tenant();
        abort_unless(
            $tenant && hash_equals(self::feedToken($tenant->id), (string) $request->query('t')),
            404,
        );

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Suraha//Appointments//BN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:'.self::esc('সুরাহা — সাক্ষাৎকার'),
            'X-WR-TIMEZONE:Asia/Dhaka',
        ];

        $appointments = Appointment::query()
            ->where('status', AppointmentStatus::APPROVED)
            ->whereNotNull('appointment_date')
            ->get();

        foreach ($appointments as $a) {
            $date = $a->appointment_date->toDateString();

            if ($a->appointment_time) {
                $start = Carbon::parse($date.' '.$a->appointment_time, 'Asia/Dhaka');
                // ponytail: fixed 30-minute slot — the schema stores no duration.
                $when = [
                    'DTSTART:'.$start->clone()->utc()->format('Ymd\THis\Z'),
                    'DTEND:'.$start->clone()->addMinutes(30)->utc()->format('Ymd\THis\Z'),
                ];
            } else {
                $day = Carbon::parse($date);
                $when = [
                    'DTSTART;VALUE=DATE:'.$day->format('Ymd'),
                    'DTEND;VALUE=DATE:'.$day->clone()->addDay()->format('Ymd'),
                ];
            }

            $description = implode("\n", array_filter([
                $a->description,
                $a->mobile ? 'মোবাইল: '.$a->mobile : null,
            ]));

            $lines = array_merge($lines, [
                'BEGIN:VEVENT',
                'UID:appointment-'.$a->id.'@'.$tenant->id.'.suraha',
                'DTSTAMP:'.$a->updated_at->clone()->utc()->format('Ymd\THis\Z'),
                // Bumped on every edit so subscribers replace the event rather than duplicate it.
                'SEQUENCE:'.$a->updated_at->getTimestamp(),
                ...$when,
                'SUMMARY:'.self::esc($a->calendarTitleBn()),
                'DESCRIPTION:'.self::esc($description),
                'LOCATION:'.self::esc($a->officeBn()),
                'END:VEVENT',
            ]);
        }

        $lines[] = 'END:VCALENDAR';

        // ponytail: no 75-octet line folding; calendar clients accept long lines in practice.
        return response(implode("\r\n", $lines)."\r\n", 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="suraha-appointments.ics"',
        ]);
    }

    /** The feed URL's secret. Rotating APP_KEY invalidates every subscription. */
    private static function feedToken(string $tenantId): string
    {
        return substr(hash_hmac('sha256', 'appointment-feed:'.$tenantId, (string) config('app.key')), 0, 32);
    }

    /** RFC 5545 text escaping. */
    private static function esc(string $value): string
    {
        return str_replace(['\\', "\n", ';', ','], ['\\\\', '\\n', '\\;', '\\,'], $value);
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
