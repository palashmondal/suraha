<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Enums\SuggestionKind;
use App\Enums\SuggestionStatus;
use App\Http\Resources\SuggestionResource;
use App\Models\Notification;
use App\Http\Controllers\Concerns\ManagesNotes;
use App\Models\Note;
use App\Models\Suggestion;
use App\Services\Sms\SmsGateway;
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
    use ManagesNotes;

    public function __construct(private SmsGateway $sms) {}

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

        // গুরুত্বপূর্ণ is a flag, not a status — its tab filters on the mark instead.
        $list = (clone $base)
            ->when($status === 'important', fn ($b) => $b->where('is_important', true))
            ->when(in_array($status, $statuses, true), fn ($b) => $b->where('status', $status))
            ->with('union')
            // created_at alone is not a total order — rows seeded or filed in the same second
            // tie, and a tied row can land on a different page each request, so a listing
            // could drop a row it had just shown. id breaks the tie deterministically.
            ->latest()
            ->latest('id')
            ->paginate(15);

        return response()->json([
            'data' => SuggestionResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => collect(['all', ...$statuses, 'important'])
                ->map(fn ($key) => [
                    'key' => $key,
                    'total' => match ($key) {
                        'all' => (clone $base)->count(),
                        'important' => (clone $base)->where('is_important', true)->count(),
                        default => (clone $base)->where('status', $key)->count(),
                    },
                ])->all(),
            'kinds' => SuggestionKind::options(),
        ]);
    }

    public function show(Suggestion $suggestion): SuggestionResource
    {
        return new SuggestionResource($suggestion->load('union', 'citizen', 'attachments', 'notes.author'));
    }

    /** UNO/SEAL: keep a dated note on this পরামর্শ — what was decided, who was told, what follows.
     *  Notes accumulate; the citizen is not notified. */
    public function addNote(Request $request, Suggestion $suggestion): SuggestionResource
    {
        $this->storeNote($request, $suggestion);

        return new SuggestionResource($suggestion->load('union', 'citizen', 'attachments', 'notes.author'));
    }

    /** UNO/SEAL: drop a note written in error. */
    public function deleteNote(Suggestion $suggestion, Note $note): SuggestionResource
    {
        $this->destroyNote($suggestion, $note);

        return new SuggestionResource($suggestion->load('union', 'citizen', 'attachments', 'notes.author'));
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
            'address' => ['nullable', 'string', 'max:255'],
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

        $suggestion = Suggestion::create($data);

        Notification::emit(
            'suggestion',
            Role::UNO,
            'নতুন নাগরিক পরামর্শ',
            $suggestion->title,
            '/advice/'.$suggestion->id,
        );

        // A thank-you the citizen can keep: it carries the tracking token, which is the only way
        // back to a suggestion filed without an account. Confidential ones are thanked too — the
        // message goes to the number they gave, and says nothing about who they are.
        $phone = $suggestion->mobile ?: $user->phone;
        if ($phone) {
            $this->sms->send(
                $phone,
                'সুরাহা: আপনার পরামর্শের জন্য ধন্যবাদ। ট্র্যাকিং নম্বর: '.$suggestion->tracking_token,
                'suggestion',
            );
        }

        return new SuggestionResource($suggestion->load('union', 'attachments'));
    }

    /** UNO: mark a পরামর্শ as গুরুত্বপূর্ণ, or take the mark off. Independent of its status. */
    public function important(Request $request, Suggestion $suggestion): SuggestionResource
    {
        $data = $request->validate(['is_important' => ['required', 'boolean']]);

        $suggestion->update(['is_important' => $data['is_important']]);

        return new SuggestionResource($suggestion->load('union', 'attachments'));
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

        return new SuggestionResource($suggestion->load('union', 'attachments'));
    }
}
