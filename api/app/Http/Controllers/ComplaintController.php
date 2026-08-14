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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $this->requireTenant();
        $user = $request->user();

        $base = Complaint::query()
            ->when($user->role === Role::INVESTIGATING_OFFICER, fn ($b) => $b->where('investigating_officer_id', $user->id))
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('title', 'like', "%{$q}%")
                ->orWhere('complainant_name', 'like', "%{$q}%")));

        $statuses = ['pending', 'assigned', 'completed', 'rejected'];
        $status = $request->query('status', 'all');

        $list = (clone $base)
            ->when(in_array($status, $statuses, true), fn ($b) => $b->where('status', $status))
            ->with('union', 'investigatingOfficer')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => ComplaintResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => collect(['all', ...$statuses])
                ->map(fn ($key) => [
                    'key' => $key,
                    'total' => $key === 'all'
                        ? (clone $base)->count()
                        : (clone $base)->where('status', $key)->count(),
                ])->all(),
        ]);
    }

    public function show(Complaint $complaint): ComplaintResource
    {
        return new ComplaintResource(
            $complaint->load('union', 'investigatingOfficer', 'citizen', 'events.actor', 'events.attachments'),
        );
    }

    /** File a complaint (citizen, or officer on behalf) → pending. */
    public function store(Request $request): ComplaintResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'complainant_name' => ['required', 'string', 'max:120'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],
            'complaint_date' => ['nullable', 'date'],
            'complaint_time' => ['nullable', 'date_format:H:i'],
            'description' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $data['created_by'] = $user->id;
        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }
        $data['status'] = ComplaintStatus::PENDING;
        $data['tracking_token'] = \App\Support\TrackingToken::generate('SUR-CMP', 'complaints');

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
                Rule::exists('users', 'id')->where('role', Role::INVESTIGATING_OFFICER->value),
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

        $this->recordEvent($complaint, 'accepted', $data['comment'] ?? null, [
            'officer_id' => $officer->id,
            'officer_name' => $officer->name,
            'due_date' => $data['due_date'],
        ], $request->user());

        $this->notifyOfficers('তদন্তের জন্য নতুন অভিযোগ', $complaint);

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
        ]);

        $complaint->fill([
            'status' => ComplaintStatus::ASSIGNED,
            'hearing_date' => null,
            'due_date' => $data['due_date'] ?? $complaint->due_date,
        ])->save();

        $this->recordEvent($complaint, 'reinvestigation', $data['comment'], [
            'due_date' => $data['due_date'] ?? null,
        ], $request->user());

        $this->notifyOfficers('পুনঃতদন্তের নির্দেশ', $complaint);

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

        return response()->json(['hearings' => $hearings]);
    }

    /** The upazila's investigating officers, for the assign dropdown. */
    public function investigators(): JsonResponse
    {
        $officers = User::where('role', Role::INVESTIGATING_OFFICER->value)
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

    private function notifyOfficers(string $title, Complaint $complaint): void
    {
        Notification::emit('complaint', Role::INVESTIGATING_OFFICER, $title, $complaint->title, '/complaint/'.$complaint->id);
    }

    private function fresh(Complaint $complaint): ComplaintResource
    {
        return new ComplaintResource(
            $complaint->load('union', 'investigatingOfficer', 'citizen', 'events.actor', 'events.attachments'),
        );
    }

    private function requireTenant(): void
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
    }
}
