<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Enums\SuggestionKind;
use App\Enums\SuggestionStatus;
use App\Http\Resources\SuggestionResource;
use App\Models\Notification;
use App\Models\Suggestion;
use App\Support\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * নাগরিক পরামর্শ (§8). What a citizen thinks the upazila should do — a bridge, a school, a road —
 * or something they would rather say privately. The UNO reads it and takes it forward or sets it
 * aside; there is no investigation and no schedule.
 *
 * A confidential suggestion travels without its author: the search deliberately does not look at
 * applicant_name, or a name could be confirmed by probing for it.
 */
class SuggestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->requireTenantForListing($request->user());

        $base = Suggestion::query()
            ->when($request->query('kind'), fn ($b, $k) => $b->where('kind', $k))
            ->when($request->query('q'), fn ($b, $q) => $b->where(fn ($w) => $w
                ->where('title', 'ilike', "%{$q}%")
                ->orWhere('tracking_token', 'ilike', "%{$q}%")
                ->orWhere(fn ($n) => $n->where('is_confidential', false)->where('applicant_name', 'ilike', "%{$q}%"))));

        $status = $request->query('status', 'all');
        $statuses = ['pending', 'accepted', 'rejected'];

        $list = (clone $base)
            ->when(in_array($status, $statuses, true), fn ($b) => $b->where('status', $status))
            ->with('union')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => SuggestionResource::collection($list->items()),
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
            'kinds' => SuggestionKind::options(),
        ]);
    }

    public function show(Suggestion $suggestion): SuggestionResource
    {
        return new SuggestionResource($suggestion->load('union', 'citizen'));
    }

    public function store(Request $request): SuggestionResource
    {
        $this->requireTenant();

        $data = $request->validate([
            'applicant_name' => ['required', 'string', 'max:120'],
            'kind' => ['required', 'string', 'in:'.implode(',', array_column(SuggestionKind::cases(), 'value'))],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string'],
            'is_confidential' => ['nullable', 'boolean'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        // Idempotent create for the offline PWA: a retried submit with the same client_uuid returns
        // the already-created suggestion instead of duplicating it.
        if (! empty($data['client_uuid'])) {
            $existing = Suggestion::where('client_uuid', $data['client_uuid'])->first();
            if ($existing) {
                return new SuggestionResource($existing->load('union'));
            }
        }

        $user = $request->user();
        $data['created_by'] = $user->id;

        if ($user->role === Role::CITIZEN) {
            $data['citizen_id'] = $user->id;
        }

        $data['tracking_token'] = TrackingToken::generate('SUR-SUG', 'suggestions');

        $suggestion = Suggestion::create($data);

        Notification::emit(
            'suggestion',
            Role::UNO,
            'নতুন নাগরিক পরামর্শ',
            $suggestion->title,
            '/advice/'.$suggestion->id,
        );

        return new SuggestionResource($suggestion->load('union'));
    }

    public function accept(Request $request, Suggestion $suggestion): SuggestionResource
    {
        return $this->decide($request, $suggestion, SuggestionStatus::ACCEPTED);
    }

    public function reject(Request $request, Suggestion $suggestion): SuggestionResource
    {
        return $this->decide($request, $suggestion, SuggestionStatus::REJECTED);
    }

    private function decide(Request $request, Suggestion $suggestion, SuggestionStatus $status): SuggestionResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string']]);

        $suggestion->update([
            'status' => $status,
            'decided_at' => now(),
            'decision_note' => $data['decision_note'] ?? null,
        ]);

        return new SuggestionResource($suggestion->load('union'));
    }
}
