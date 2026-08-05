<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ComplaintStatus;
use App\Enums\Role;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * অভিযোগ (§8.4). Citizens file; UNO schedules + assigns an investigating officer; that officer
 * submits findings; UNO resolves/rejects. Tenant-scoped. Investigating officers only ever see
 * complaints assigned to them.
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

        $status = $request->query('status', 'all');
        $statuses = ['filed', 'scheduled', 'assigned', 'resolved', 'rejected'];

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
            'tabs' => collect(['all', 'filed', 'scheduled', 'assigned', 'resolved'])
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
        return new ComplaintResource($complaint->load('union', 'investigatingOfficer', 'citizen'));
    }

    /** File a complaint (citizen, or officer on behalf). */
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
        $data['tracking_token'] = \App\Support\TrackingToken::generate('SUR-CMP', 'complaints');

        $complaint = Complaint::create($data);

        return new ComplaintResource($complaint->load('union'));
    }

    /** UNO: add a schedule (শিডিউলযুক্ত করুন / নতুন শিডিউল যুক্ত করুন). */
    public function schedule(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['schedule_date' => ['required', 'date']]);

        $complaint->fill([
            'schedule_date' => $data['schedule_date'],
            'scheduled_at' => $complaint->scheduled_at ?? now(),
            'status' => $complaint->status === ComplaintStatus::FILED ? ComplaintStatus::SCHEDULED : $complaint->status,
        ])->save();

        return new ComplaintResource($complaint->load('union', 'investigatingOfficer'));
    }

    /** UNO: assign an investigating officer (তদন্তকারী নিযুক্ত করুন). */
    public function assign(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate([
            'investigating_officer_id' => [
                'required', 'integer',
                Rule::exists('users', 'id')->where('role', Role::INVESTIGATING_OFFICER->value),
            ],
        ]);

        $complaint->fill([
            'investigating_officer_id' => $data['investigating_officer_id'],
            'assigned_at' => now(),
            'status' => ComplaintStatus::ASSIGNED,
        ])->save();

        return new ComplaintResource($complaint->load('union', 'investigatingOfficer'));
    }

    /** Investigating officer: submit findings (populates নিষ্পত্তির বিস্তারিত). */
    public function submitFindings(Request $request, Complaint $complaint): ComplaintResource
    {
        abort_unless(
            $request->user()->role === Role::SEAL_ADMIN
                || $complaint->investigating_officer_id === $request->user()->id,
            403,
            'এই অভিযোগ আপনাকে বরাদ্দ করা হয়নি।',
        );

        $data = $request->validate(['findings' => ['required', 'string']]);
        $complaint->update(['findings' => $data['findings']]);

        return new ComplaintResource($complaint->load('union', 'investigatingOfficer'));
    }

    /** UNO: mark resolved (নিষ্পত্তি সম্পন্ন). */
    public function resolve(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['resolution_note' => ['nullable', 'string']]);

        $complaint->fill([
            'status' => ComplaintStatus::RESOLVED,
            'resolved_at' => now(),
            'resolution_note' => $data['resolution_note'] ?? $complaint->resolution_note,
        ])->save();

        return new ComplaintResource($complaint->load('union', 'investigatingOfficer'));
    }

    /** UNO: reject (নাকচ করুন). */
    public function reject(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['resolution_note' => ['nullable', 'string']]);

        $complaint->fill([
            'status' => ComplaintStatus::REJECTED,
            'rejected_at' => now(),
            'resolution_note' => $data['resolution_note'] ?? $complaint->resolution_note,
        ])->save();

        return new ComplaintResource($complaint->load('union', 'investigatingOfficer'));
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

    private function requireTenant(): void
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
    }
}
