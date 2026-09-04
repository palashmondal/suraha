<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ComplaintStatus;
use App\Enums\Role;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\ComplaintEvent;
use App\Models\Notification;
use App\Models\User;
use App\Support\IcsFeed;
use App\Support\UpazilaOffice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Rule;

/**
 * অভিযোগ (§8.4). Flow: citizen files (pending) → UNO reviews: reject, or accept & appoint an
 * investigating officer with a report due date (assigned) → officer submits an investigation
 * report (PDF + images) → UNO schedules a hearing → UNO's order after the hearing: complete, or
 * order re-investigation (back to the officer). Every step is recorded as a complaint_event so the
 * detail page renders a full chronological timeline. Tenant-scoped; investigators only see their
 * own assignments.
 */
class ComplaintController extends Controller
{
    /** List with the lifecycle tabs + counts + search. Scoped to the assignee for investigators. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenantForListing($request->user());
        $user = $request->user();

        $base = Complaint::query()
            ->when($user->role->canInvestigate(), fn ($b) => $b->where('investigating_officer_id', $user->id))
            // One officer's desk (তদন্ত কর্মকর্তা তালিকা → officer page). Applied after the line
            // above, so an investigator can never widen the list past their own assignments.
            ->when($request->query('officer'), fn ($b, $id) => $b->where('investigating_officer_id', $id))
            // Only the columns the তালিকা actually shows, so every hit is visible in its row.
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('title', 'ilike', "%{$q}%")
                ->orWhere('complainant_name', 'ilike', "%{$q}%")
                ->orWhere('description', 'ilike', "%{$q}%")));

        // Lifecycle order, and a partition: every complaint falls in exactly one, so সকল is still
        // the tabs added up. শুনানি নির্ধারিত is not a status of its own — it is an assigned
        // complaint that has a hearing date — so নিযুক্ত means "assigned, hearing not set yet".
        $filters = [
            'pending' => fn ($b) => $b->where('status', ComplaintStatus::PENDING),
            'assigned' => fn ($b) => $b->where('status', ComplaintStatus::ASSIGNED)->whereNull('hearing_date'),
            'hearing_scheduled' => fn ($b) => $b->where('status', ComplaintStatus::ASSIGNED)->whereNotNull('hearing_date'),
            'completed' => fn ($b) => $b->where('status', ComplaintStatus::COMPLETED),
            'rejected' => fn ($b) => $b->where('status', ComplaintStatus::REJECTED),
            // Not a তালিকা tab — the officer page groups its work as চলমান vs সম্পন্ন, and
            // "under investigation" is simply ASSIGNED, hearing set or not.
            'in_progress' => fn ($b) => $b->where('status', ComplaintStatus::ASSIGNED),
        ];

        // The five that partition the register; `in_progress` overlaps them, so it is filterable
        // but never counted as a tab of its own.
        $tabKeys = ['pending', 'assigned', 'hearing_scheduled', 'completed', 'rejected'];

        $status = $request->query('status', 'all');

        $list = (clone $base)
            ->when(isset($filters[$status]), $filters[$status] ?? null)
            ->with('union', 'upazila', 'investigatingOfficer')
            // created_at alone is not a total order — rows seeded or filed in the same second
            // tie, and a tied row can land on a different page each request, so a listing
            // could drop a row it had just shown. id breaks the tie deterministically.
            ->latest()
            ->latest('id')
            ->paginate(15);

        return response()->json([
            'data' => ComplaintResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => collect(['all', ...$tabKeys])
                ->map(fn ($key) => [
                    'key' => $key,
                    'total' => $key === 'all'
                        ? (clone $base)->count()
                        : $filters[$key](clone $base)->count(),
                ])->all(),
        ]);
    }

    public function show(Request $request, Complaint $complaint): ComplaintResource
    {
        // index() scopes an investigating role to its own assignments; without the same guard
        // here the detail route handed out any complaint in the upazila by id.
        abort_if(
            $request->user()->role->canInvestigate()
                && $complaint->investigating_officer_id !== $request->user()->id,
            403,
            'এই অভিযোগ আপনার দায়িত্বে নেই।',
        );

        return new ComplaintResource(
            $complaint->load('union', 'investigatingOfficer', 'citizen', 'attachments', 'events.actor', 'events.attachments'),
        );
    }

    /** File a complaint (citizen, or officer on behalf) → pending. */
    public function store(Request $request): ComplaintResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'complainant_name' => ['required', 'string', 'max:120'],
            'father_name' => ['nullable', 'string', 'max:120'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],
            'complaint_date' => ['nullable', 'date'],
            'complaint_time' => ['nullable', 'date_format:H:i'],
            'description' => ['nullable', 'string'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        // Idempotent create for the offline PWA: a retried submit with the same client_uuid returns
        // the already-created complaint instead of duplicating it.
        if (! empty($data['client_uuid'])) {
            $existing = Complaint::where('client_uuid', $data['client_uuid'])->first();
            if ($existing) {
                return $this->fresh($existing);
            }
        }

        $user = $request->user();
        $data['created_by'] = $user->id;
        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }
        $data['status'] = ComplaintStatus::PENDING;
        $complaint = Complaint::create($data);
        $this->recordEvent($complaint, 'filed', null, [], $user);

        Notification::emit(
            'complaint',
            Role::UNO,
            'নতুন অভিযোগ দাখিল হয়েছে',
            $complaint->title,
            '/complaint/'.$complaint->id,
        );

        return $this->fresh($complaint);
    }

    /** UNO: accept the complaint & appoint an investigating officer with a report due date. */
    public function accept(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate([
            'investigating_officer_id' => [
                'required', 'integer',
                Rule::exists('users', 'id')->whereIn('role', Role::investigatorRoles()),
            ],
            'due_date' => ['required', 'date', 'after_or_equal:today'],
            'comment' => ['nullable', 'string'],
        ]);

        $officer = User::find($data['investigating_officer_id']);

        $complaint->fill([
            'investigating_officer_id' => $officer->id,
            'assigned_at' => now(),
            'due_date' => $data['due_date'],
            'hearing_date' => null,
            'status' => ComplaintStatus::ASSIGNED,
        ])->save();

        // The timeline sentence is composed from this meta, not stored as prose — so it stays
        // right if a name or designation is later corrected. `comment` keeps the UNO's own note.
        $this->recordEvent($complaint, 'accepted', $data['comment'] ?? null, [
            'officer_id' => $officer->id,
            'officer_name' => $officer->name,
            'officer_designation' => $officer->designation,
            'due_date' => $data['due_date'],
        ], $request->user());

        $this->notifyOfficers('তদন্তের জন্য নতুন অভিযোগ', $complaint, $officer);

        return $this->fresh($complaint);
    }

    /** UNO: reject the complaint at review. */
    public function reject(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['comment' => ['nullable', 'string']]);

        $complaint->fill([
            'status' => ComplaintStatus::REJECTED,
            'rejected_at' => now(),
        ])->save();

        $this->recordEvent($complaint, 'rejected', $data['comment'] ?? null, [], $request->user());

        return $this->fresh($complaint);
    }

    /** Investigating officer: submit an investigation report (PDF + images + comment). */
    public function report(Request $request, Complaint $complaint): ComplaintResource
    {
        $user = $request->user();
        abort_unless(
            $user->role === Role::SEAL_ADMIN || $complaint->investigating_officer_id === $user->id,
            403,
            'এই অভিযোগ আপনাকে বরাদ্দ করা হয়নি।',
        );

        $request->validate([
            'comment' => ['nullable', 'string'],
            'document' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'images' => ['nullable', 'array', 'max:10'],
            'images.*' => ['image', 'max:10240'],
        ], [
            // PHP drops a file larger than upload_max_filesize before the app ever sees it, and
            // Laravel reports that as `uploaded` — the default message ("failed to upload") names
            // no cause, which reads as a broken button.
            'document.uploaded' => 'ফাইলটি আপলোড করা যায়নি। সার্ভারের সর্বোচ্চ আপলোড সীমার (upload_max_filesize) চেয়ে বড় ফাইল গ্রহণ করা যায় না।',
            'images.*.uploaded' => 'ছবিটি আপলোড করা যায়নি। সার্ভারের সর্বোচ্চ আপলোড সীমার চেয়ে বড় ফাইল গ্রহণ করা যায় না।',
            'document.max' => 'প্রতিবেদনের ফাইল সর্বোচ্চ ১০ MB হতে পারে।',
            'document.mimes' => 'প্রতিবেদন PDF ফরম্যাটে জমা দিতে হবে।',
            'images.*.max' => 'প্রতিটি ছবি সর্বোচ্চ ১০ MB হতে পারে।',
        ]);

        $event = $this->recordEvent($complaint, 'report', $request->input('comment'), [], $user);

        if ($request->hasFile('document')) {
            $this->attach($event, $request->file('document'), 'pdf');
        }
        foreach ((array) $request->file('images', []) as $image) {
            $this->attach($event, $image, 'image');
        }

        // A new report supersedes any previously-scheduled hearing.
        $complaint->update(['hearing_date' => null]);

        Notification::emit(
            'complaint',
            Role::UNO,
            'তদন্ত প্রতিবেদন জমা হয়েছে',
            $complaint->title,
            '/complaint/'.$complaint->id,
        );

        return $this->fresh($complaint);
    }

    /** UNO: schedule a hearing after a report — the date lands on the UNO's schedule (§8.4). */
    public function scheduleHearing(Request $request, Complaint $complaint): ComplaintResource
    {
        // A শুনানি sits on the investigation report — there is nothing to hear before one is in.
        // The UI already hides the button, but that is not enforcement; after a পুনঃতদন্ত the
        // latest step is `reinvestigation` again, so a fresh report is required each time.
        abort_unless(
            // reorder(), not latest(): the relation already sorts ascending, and a second
            // orderBy would just be appended — leaving the first event, not the last.
            $complaint->events()->reorder('id', 'desc')->value('type') === 'report',
            422,
            'তদন্ত প্রতিবেদন জমা হওয়ার পর শুনানির তারিখ নির্ধারণ করা যাবে।',
        );

        $data = $request->validate([
            'hearing_date' => ['required', 'date', 'after_or_equal:today'],
            'comment' => ['nullable', 'string'],
        ]);

        $complaint->update(['hearing_date' => $data['hearing_date']]);

        $this->recordEvent($complaint, 'hearing_scheduled', $data['comment'] ?? null, [
            'hearing_date' => $data['hearing_date'],
        ], $request->user());

        return $this->fresh($complaint);
    }

    /** UNO: order after the hearing — mark the complaint completed with a detailed instruction. */
    public function complete(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['comment' => ['required', 'string']]);

        $complaint->fill([
            'status' => ComplaintStatus::COMPLETED,
            'completed_at' => now(),
            'hearing_date' => null,
        ])->save();

        $this->recordEvent($complaint, 'completed', $data['comment'], [], $request->user());

        return $this->fresh($complaint);
    }

    /** UNO: order after the hearing — send it back to the officer for re-investigation. */
    public function reinvestigate(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate([
            'comment' => ['required', 'string'],
            'due_date' => ['nullable', 'date', 'after_or_equal:today'],
            // A পুনঃতদন্ত may go back to the same officer or to a different one — the UNO's call,
            // so the officer is part of the order rather than carried over silently.
            'investigating_officer_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->whereIn('role', Role::investigatorRoles()),
            ],
        ]);

        $officer = isset($data['investigating_officer_id'])
            ? User::find($data['investigating_officer_id'])
            : $complaint->investigatingOfficer;

        $complaint->fill([
            'status' => ComplaintStatus::ASSIGNED,
            'hearing_date' => null,
            'due_date' => $data['due_date'] ?? $complaint->due_date,
            'investigating_officer_id' => $officer?->id ?? $complaint->investigating_officer_id,
        ])->save();

        $this->recordEvent($complaint, 'reinvestigation', $data['comment'], [
            'due_date' => $data['due_date'] ?? null,
            'officer_id' => $officer?->id,
            'officer_name' => $officer?->name,
            'officer_designation' => $officer?->designation,
        ], $request->user());

        $this->notifyOfficers('পুনঃতদন্তের নির্দেশ', $complaint, $officer);

        return $this->fresh($complaint);
    }

    /** The UNO's hearing schedule — complaints with an upcoming hearing date. */
    public function hearings(): JsonResponse
    {
        $this->requireTenant();

        $hearings = Complaint::query()
            ->whereNotNull('hearing_date')
            ->where('status', ComplaintStatus::ASSIGNED)
            ->orderBy('hearing_date')
            ->get(['id', 'title', 'complainant_name', 'hearing_date', 'status'])
            ->map(fn (Complaint $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'complainant_name' => $c->complainant_name,
                'hearing_date' => $c->hearing_date?->toDateString(),
            ]);

        return response()->json([
            'hearings' => $hearings,
            // Paste into Google Calendar → Other calendars → From URL (§8.4, optional).
            'feed_url' => IcsFeed::url('/api/complaints/hearings.ics', 'hearing', tenant()->id),
        ]);
    }

    /**
     * The শুনানি ক্যালেন্ডার as an iCalendar feed, so the UNO can subscribe to it from Google
     * Calendar exactly as with the সাক্ষাৎকার সূচি. Unauthenticated — Google sends no Bearer
     * token — so the ?t= HMAC in the URL is the secret. Read-only and one-way.
     */
    public function hearingsCalendarFeed(Request $request): Response
    {
        $tenant = tenant();
        abort_unless(
            $tenant && hash_equals(IcsFeed::token('hearing', $tenant->id), (string) $request->query('t')),
            404,
        );

        $events = Complaint::query()
            ->whereNotNull('hearing_date')
            ->where('status', ComplaintStatus::ASSIGNED)
            ->with('investigatingOfficer')
            ->get()
            ->map(fn (Complaint $c) => [
                'uid' => 'hearing-'.$c->id.'@'.$tenant->id.'.suraha',
                'stamp' => $c->updated_at,
                // A hearing carries a date but no time, so it lands as an all-day event.
                'date' => $c->hearing_date->toDateString(),
                'time' => null,
                'summary' => 'অভিযোগ শুনানি: '.$c->complainant_name.' — '.$c->title,
                'description' => implode("\n", array_filter([
                    $c->description,
                    $c->investigatingOfficer ? 'তদন্তকারী কর্মকর্তা: '.$c->investigatingOfficer->name : null,
                    $c->mobile ? 'মোবাইল: '.$c->mobile : null,
                ])),
                'location' => UpazilaOffice::nameBn(),
            ])->all();

        return IcsFeed::response('সুরাহা — অভিযোগ শুনানি', 'suraha-hearings.ics', $events);
    }

    /** The upazila's investigating officers, for the assign dropdown. */
    public function investigators(): JsonResponse
    {
        $officers = User::whereIn('role', Role::investigatorRoles())
            ->where('tenant_id', tenant()->getTenantKey())
            ->where('is_active', true)
            ->get(['id', 'name', 'designation'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'designation' => $u->designation]);

        return response()->json(['investigators' => $officers]);
    }

    // ---- helpers ---------------------------------------------------------

    private function recordEvent(Complaint $complaint, string $type, ?string $comment, array $meta, ?User $actor): ComplaintEvent
    {
        return $complaint->events()->create([
            'type' => $type,
            'actor_id' => $actor?->id,
            'actor_role' => $actor?->role->value,
            'comment' => $comment,
            'meta' => $meta ?: null,
        ]);
    }

    private function attach(ComplaintEvent $event, UploadedFile $file, string $kind): void
    {
        $path = $file->store('complaints/'.$event->complaint_id, 'public');

        $event->attachments()->create([
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'kind' => $kind,
        ]);
    }

    /**
     * Notifications are role-targeted, so this addresses the assignee's OWN role — widening the
     * appointable pool must not ping every সচিব about a তদন্ত কর্মকর্তা's case, or the reverse.
     */
    private function notifyOfficers(string $title, Complaint $complaint, ?User $officer): void
    {
        if (! $officer) {
            return;
        }

        Notification::emit('complaint', $officer->role, $title, $complaint->title, '/complaint/'.$complaint->id);
    }

    private function fresh(Complaint $complaint): ComplaintResource
    {
        return new ComplaintResource(
            $complaint->load('union', 'investigatingOfficer', 'citizen', 'attachments', 'events.actor', 'events.attachments'),
        );
    }
}
