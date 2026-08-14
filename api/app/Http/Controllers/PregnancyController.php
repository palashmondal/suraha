<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\DeliveryStatus;
use App\Http\Resources\PregnancyResource;
use App\Models\Pregnancy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * প্রসূতি কল্যাণ (§8.1). All queries are tenant-scoped by the Pregnancy global scope, so a request
 * only ever touches the current upazila's records. Requires a resolved upazila context.
 */
class PregnancyController extends Controller
{
    /** List with the সকল / ডেলিভারী হয়নি / ডেলিভারি হয়েছে tabs, counts, search + filters. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenant();

        $status = $request->query('status', 'all');
        $q = trim((string) $request->query('q', ''));

        // Base query: search + union/ward filters (shared by the list and the tab counts).
        $base = Pregnancy::query()
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w
                ->where('mother_name_bn', 'like', "%{$q}%")
                ->orWhere('husband_name', 'like', "%{$q}%")
                ->orWhere('mobile', 'like', "%{$q}%")
                ->orWhere('register_no', 'like', "%{$q}%")))
            ->when($request->query('union_id'), fn ($b, $u) => $b->where('union_id', $u))
            ->when($request->query('ward_no'), fn ($b, $w) => $b->where('ward_no', $w));

        $list = (clone $base)
            ->when(
                in_array($status, ['not_delivered', 'delivered'], true),
                fn ($b) => $b->where('delivery_status', $status),
            )
            ->with('union')
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
        return new PregnancyResource($pregnancy->load('union', 'creator'));
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

        return new PregnancyResource($pregnancy->load('union'));
    }

    // ---- helpers ---------------------------------------------------------

    private function tabCounts($base): array
    {
        $countNew = fn ($b) => (clone $b)->where('created_at', '>=', now()->subDays(7))->count();

        $all = clone $base;
        $notDelivered = (clone $base)->where('delivery_status', 'not_delivered');
        $delivered = (clone $base)->where('delivery_status', 'delivered');

        return [
            ['key' => 'all', 'total' => (clone $all)->count(), 'new' => $countNew($all)],
            ['key' => 'not_delivered', 'total' => (clone $notDelivered)->count(), 'new' => $countNew($notDelivered)],
            ['key' => 'delivered', 'total' => (clone $delivered)->count(), 'new' => $countNew($delivered)],
        ];
    }

    private function requireTenant(): void
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
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
