<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BirthRegStatus;
use App\Enums\DeliveryStatus;
use App\Http\Resources\PregnancyResource;
use App\Models\Pregnancy;
use App\Services\Bdris\BirthRegistrationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * প্রসূতি কল্যাণ (§8.1). All queries are tenant-scoped by the Pregnancy global scope, so a request
 * only ever touches the current upazila's records. Requires a resolved upazila context.
 */
class PregnancyController extends Controller
{
    public function __construct(private BirthRegistrationService $births) {}

    /** List with the সকল / ডেলিভারী হয়নি / ডেলিভারি হয়েছে tabs, counts, search + filters. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenantForListing($request->user());

        $status = $request->query('status', 'all');
        $q = trim((string) $request->query('q', ''));

        // Base query: search + union/ward filters (shared by the list and the tab counts).
        // Words are separate terms, each of which must match somewhere — "ডুমুরিয়া আয়েশা" means
        // that upazila AND that name, not the one literal string, which matched no column at all.
        $base = Pregnancy::query()
            ->when($q !== '', function (Builder $b) use ($q) {
                foreach (preg_split('/\s+/u', $q, -1, PREG_SPLIT_NO_EMPTY) as $term) {
                    $b->where(fn (Builder $w) => $this->searchClause($w, $term));
                }
            })
            ->when($request->query('union_id'), fn ($b, $u) => $b->where('union_id', $u))
            ->when($request->query('ward_no'), fn ($b, $w) => $b->where('ward_no', $w));

        $list = (clone $base)
            ->when(
                in_array($status, ['not_delivered', 'delivered'], true),
                fn ($b) => $b->where('delivery_status', $status),
            )
            ->with('union', 'birthRegistration', 'upazila.district')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => PregnancyResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
                'per_page' => $list->perPage(),
            ],
            'tabs' => $this->tabCounts($base),
        ]);
    }

    public function store(Request $request): PregnancyResource
    {
        $this->requireTenant();

        $data = $request->validate($this->rules(creating: true));
        $data['created_by'] = $request->user()->id;

        // Idempotent create for the offline mobile app: a retried submit with the same client_uuid
        // returns the already-created mother instead of duplicating it.
        if (! empty($data['client_uuid'])) {
            $existing = Pregnancy::where('client_uuid', $data['client_uuid'])->first();
            if ($existing) {
                return new PregnancyResource($existing->load('union'));
            }
        }

        $pregnancy = Pregnancy::create($data);

        // Notify the Sochib that a new mother was added for review (§8.1).
        \App\Models\Notification::emit(
            'pregnancy',
            \App\Enums\Role::UP_SOCHIB,
            'নতুন প্রসূতি তথ্য যুক্ত হয়েছে',
            $pregnancy->mother_name_bn,
            '/pregnancy/'.$pregnancy->id,
        );

        return new PregnancyResource($pregnancy->load('union'));
    }

    public function show(Pregnancy $pregnancy): PregnancyResource
    {
        return new PregnancyResource($pregnancy->load('union', 'creator', 'birthRegistration', 'upazila.district'));
    }

    public function update(Request $request, Pregnancy $pregnancy): PregnancyResource
    {
        $data = $request->validate($this->rules(creating: false));
        $pregnancy->update($data);

        return new PregnancyResource($pregnancy->load('union'));
    }

    /**
     * Confirm delivery (FWA) — sets ডেলিভারি হয়েছে + the post-delivery fields. When delivered, the
     * UI reveals the "জন্ম নিবন্ধন তৈরি করুন" action (birth registration flows next).
     */
    public function updateDeliveryStatus(Request $request, Pregnancy $pregnancy): PregnancyResource
    {
        $data = $request->validate([
            'delivery_status' => ['required', Rule::enum(DeliveryStatus::class)],
            // Optional: often no name has been chosen on the day of the delivery.
            'child_name' => ['nullable', 'string', 'max:120'],
            'actual_delivery_date' => ['nullable', 'date'],
            'mother_alive' => ['nullable', 'boolean'],
            'delivery_type' => ['nullable', Rule::in(['normal', 'cesarean'])],
            'delivery_place' => ['nullable', 'string', 'max:160'],
            'newborn_count' => ['nullable', 'integer', 'min:0', 'max:10'],
            'newborn_alive' => ['nullable', 'boolean'],
            'baby_sex' => ['nullable', Rule::in(['male', 'female'])],
            'birth_weight_kg' => ['nullable', 'numeric', 'min:0', 'max:9'],
            'birth_height_inch' => ['nullable', 'numeric', 'min:0', 'max:40'],
            'birth_time' => ['nullable', 'date_format:H:i'],
        ]);

        $pregnancy->update($data);

        // A confirmed delivery puts the newborn straight into the নবজাতক তালিকা (§8.2) as
        // জন্মনিবন্ধন সম্পন্ন হয়নি; the সচিব's approval is what later files it with BDRIS.
        if ($pregnancy->isDelivered()) {
            $this->births->pendingFor($pregnancy, $request->user()->id);
        } else {
            // Status reversed (a mistaken confirmation) — take the newborn back out, unless it
            // has already been entered, in which case the certificate stands.
            $pregnancy->birthRegistration()->where('status', BirthRegStatus::PENDING_ENTRY)->delete();
        }

        return new PregnancyResource($pregnancy->load('union', 'birthRegistration'));
    }

    // ---- helpers ---------------------------------------------------------

    /**
     * One term of the search, matched against exactly the columns the listing shows — her name, her husband's, district, upazila,
     * union, ward and mobile — and nothing else. Fewer than the table displays makes the box look
     * broken; more (address, register number, the English name) returns rows with the term nowhere
     * on screen, which reads as a wrong result.
     *
     * Ward is typed as it is displayed, in Bengali digits, so those are folded to ASCII first.
     * Delivery status is a tab, not a search term, and the dates are formatted for display only.
     */
    private function searchClause(Builder $w, string $q): Builder
    {
        $like = '%'.$q.'%';
        $digits = strtr($q, ['০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9']);

        return $w
            ->where('mother_name_bn', 'ilike', $like)
            ->orWhere('husband_name', 'ilike', $like)
            ->orWhere('mobile', 'ilike', $like)
            ->when(ctype_digit($digits), fn ($b) => $b->orWhere('ward_no', (int) $digits))
            ->orWhereHas('union', fn ($u) => $u->where('name_bn', 'ilike', $like)->orWhere('name', 'ilike', $like))
            ->orWhereHas('upazila', fn ($t) => $t
                ->where('name_bn', 'ilike', $like)
                ->orWhere('name', 'ilike', $like)
                ->orWhereHas('district', fn ($d) => $d->where('name_bn', 'ilike', $like)->orWhere('name', 'ilike', $like)));
    }

    /**
     * Every tab's total and "new this week" in ONE grouped pass, rather than six count queries
     * that each scan the same rows. `count(*) filter (where …)` is standard SQL; Postgres runs
     * both aggregates off the single scan the index already gives us.
     */
    private function tabCounts($base): array
    {
        $rows = (clone $base)
            ->reorder()
            ->selectRaw('delivery_status, count(*) as total, count(*) filter (where created_at >= ?) as fresh', [now()->subDays(7)])
            ->groupBy('delivery_status')
            ->get()
            ->keyBy('delivery_status');

        $total = fn (string $key) => (int) ($rows[$key]->total ?? 0);
        $fresh = fn (string $key) => (int) ($rows[$key]->fresh ?? 0);

        return [
            [
                'key' => 'all',
                'total' => $total('not_delivered') + $total('delivered'),
                'new' => $fresh('not_delivered') + $fresh('delivered'),
            ],
            ['key' => 'not_delivered', 'total' => $total('not_delivered'), 'new' => $fresh('not_delivered')],
            ['key' => 'delivered', 'total' => $total('delivered'), 'new' => $fresh('delivered')],
        ];
    }


    /**
     * Full §8.1 field rules. mother_name_bn is the only required field; everything else is
     * optional so an FWA can save progressively from the field.
     */
    private function rules(bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';

        return [
            // Offline mobile idempotency key (optional; only meaningful on create).
            'client_uuid' => ['nullable', 'uuid'],
            'mother_name_bn' => [$req, 'string', 'max:120'],
            'mother_name_en' => ['nullable', 'string', 'max:120'],
            'husband_name' => ['nullable', 'string', 'max:120'],
            'husband_name_en' => ['nullable', 'string', 'max:120'],
            // Parent identity for the BDRIS birth-registration application. A BD NID is 10, 13 or
            // 17 digits; a birth-registration number is always 17.
            'mother_nid' => ['nullable', 'string', 'regex:/^(\d{10}|\d{13}|\d{17})$/'],
            'father_nid' => ['nullable', 'string', 'regex:/^(\d{10}|\d{13}|\d{17})$/'],
            'mother_birth_reg_no' => ['nullable', 'string', 'regex:/^\d{17}$/'],
            'father_birth_reg_no' => ['nullable', 'string', 'regex:/^\d{17}$/'],
            'register_no' => ['nullable', 'string', 'max:40'],
            'which_child' => ['nullable', 'integer', 'min:1', 'max:20'],
            'height_inch' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'weight_kg' => ['nullable', 'numeric', 'min:0', 'max:300'],
            'current_age' => ['nullable', 'integer', 'min:10', 'max:60'],
            'marriage_age' => ['nullable', 'integer', 'min:10', 'max:60'],
            'blood_group' => ['nullable', 'string', 'max:5'],
            'chronic_diseases' => ['nullable', 'array'],
            'chronic_diseases.*' => ['string', 'max:60'],

            'union_id' => ['nullable', 'integer', Rule::exists('unions', 'id')],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'mobile' => ['nullable', 'string', 'regex:/^01[0-9]{9}$/'],

            'tt_vaccine_count' => ['nullable', 'integer', 'min:0', 'max:10'],
            'last_tt_date' => ['nullable', 'date'],
            'last_menstruation_date' => ['nullable', 'date'],
            'gravida_count' => ['nullable', 'integer', 'min:0', 'max:20'],
            'prior_miscarriages' => ['nullable', 'integer', 'min:0', 'max:20'],
            'last_child_age' => ['nullable', 'integer', 'min:0', 'max:40'],
            'prior_normal_deliveries' => ['nullable', 'integer', 'min:0', 'max:20'],
            'prior_cesarean_deliveries' => ['nullable', 'integer', 'min:0', 'max:20'],
            'prior_delivery_place' => ['nullable', 'string', 'max:160'],

            'expected_delivery_date' => ['nullable', 'date'],
            'delivery_place_plan' => ['nullable', 'string', 'max:160'],
            'emergency_transport' => ['nullable', 'boolean'],
            'enough_money' => ['nullable', 'boolean'],
            'blood_donor_arranged' => ['nullable', 'boolean'],
        ];
    }
}
