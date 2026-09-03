<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AssistanceKind;
use App\Enums\AssistanceStatus;
use App\Enums\Role;
use App\Http\Resources\AssistanceResource;
use App\Models\Assistance;
use App\Models\Notification;
use App\Support\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * মানবিক সহায়তা (§8). A citizen applies for help — financial, medical, disaster relief — from the
 * public site or from inside the app; the UNO approves (optionally with an amount that differs
 * from the one requested) or rejects, once. Tenant-scoped, and followable by tracking token.
 */
class AssistanceController extends Controller
{
    /** List with সকল / অপেক্ষমান / অনুমোদিত / নাকচ tabs, counts, search and a kind filter. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenantForListing($request->user());

        $base = Assistance::query()
            ->when($request->query('kind'), fn ($b, $k) => $b->where('kind', $k))
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('applicant_name', 'ilike', "%{$q}%")
                ->orWhere('title', 'ilike', "%{$q}%")
                ->orWhere('tracking_token', 'ilike', "%{$q}%")));

        $status = $request->query('status', 'all');
        $statuses = ['pending', 'approved', 'rejected'];

        $list = (clone $base)
            ->when(in_array($status, $statuses, true), fn ($b) => $b->where('status', $status))
            ->with('union')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => AssistanceResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => collect(['all', ...$statuses])
                ->map(fn ($key) => [
                    'key' => $key,
                    'total' => $key === 'all' ? (clone $base)->count() : (clone $base)->where('status', $key)->count(),
                ])->all(),
            'kinds' => AssistanceKind::options(),
        ]);
    }

    public function show(Assistance $assistance): AssistanceResource
    {
        return new AssistanceResource($assistance->load('union', 'citizen'));
    }

    /** File an application (citizen, or an officer on their behalf). */
    public function store(Request $request): AssistanceResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'applicant_name' => ['required', 'string', 'max:120'],
            'kind' => ['required', 'string', 'in:'.implode(',', array_column(AssistanceKind::cases(), 'value'))],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address' => ['nullable', 'string', 'max:255'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],
            'nid' => ['nullable', 'string', 'max:30'],
            'amount_requested' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        // Idempotent create for the offline PWA: a retried submit with the same client_uuid returns
        // the already-created request instead of duplicating it.
        if (! empty($data['client_uuid'])) {
            $existing = Assistance::where('client_uuid', $data['client_uuid'])->first();
            if ($existing) {
                return new AssistanceResource($existing->load('union'));
            }
        }

        $user = $request->user();
        $data['created_by'] = $user->id;

        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }

        $data['tracking_token'] = TrackingToken::generate('SUR-AID', 'assistances');

        $assistance = Assistance::create($data);

        Notification::emit(
            'assistance',
            Role::UNO,
            'নতুন মানবিক সহায়তার আবেদন',
            $assistance->title,
            '/humanitarian/'.$assistance->id,
        );

        return new AssistanceResource($assistance->load('union'));
    }

    /** UNO: approve, optionally granting an amount other than the one asked for. */
    public function approve(Request $request, Assistance $assistance): AssistanceResource
    {
        $data = $request->validate([
            'amount_approved' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'decision_note' => ['nullable', 'string'],
        ]);

        $assistance->update([
            'status' => AssistanceStatus::APPROVED,
            'decided_at' => now(),
            'amount_approved' => $data['amount_approved'] ?? $assistance->amount_requested,
            'decision_note' => $data['decision_note'] ?? null,
        ]);

        return new AssistanceResource($assistance->load('union'));
    }

    public function reject(Request $request, Assistance $assistance): AssistanceResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string']]);

        $assistance->update([
            'status' => AssistanceStatus::REJECTED,
            'decided_at' => now(),
            'decision_note' => $data['decision_note'] ?? null,
        ]);

        return new AssistanceResource($assistance->load('union'));
    }
}
