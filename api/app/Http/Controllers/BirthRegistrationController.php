<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BirthRegistrationResource;
use App\Models\BirthRegistration;
use App\Models\Pregnancy;
use App\Services\Bdris\BirthRegistrationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * জন্ম নিবন্ধন (§8.2). Records are normally created by Sochib approval of a delivered pregnancy
 * (which submits to BDRIS), but manual entry is also supported. Tenant-scoped.
 */
class BirthRegistrationController extends Controller
{
    public function __construct(private BirthRegistrationService $service) {}

    /** নবজাতক তালিকা: সকল / জন্মনিবন্ধন সম্পন্ন হয়নি / জন্মনিবন্ধন সম্পন্ন tabs, counts, search. */
    public function index(Request $request): JsonResponse
    {
        $this->requireTenantForListing($request->user());

        $status = $request->query('status', 'all');
        $q = trim((string) $request->query('q', ''));

        // Words are separate terms, each of which must match somewhere — "রাইসা গাবুয়া" means that
        // union AND that child, not the one literal string, which matches no column at all.
        $base = BirthRegistration::query()
            ->when($q !== '', function (Builder $b) use ($q) {
                foreach (preg_split('/\s+/u', $q, -1, PREG_SPLIT_NO_EMPTY) as $term) {
                    $b->where(fn (Builder $w) => $this->searchClause($w, $term));
                }
            });

        $list = (clone $base)
            ->when(in_array($status, ['pending_entry', 'entered'], true), fn ($b) => $b->where('status', $status))
            ->with('union', 'upazila')
            // created_at alone is not a total order — rows seeded or filed in the same second
            // tie, and a tied row can land on a different page each request, so a listing
            // could drop a row it had just shown. id breaks the tie deterministically.
            ->latest()
            ->latest('id')
            ->paginate(15);

        return response()->json([
            'data' => BirthRegistrationResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => $this->tabCounts($base),
        ]);
    }

    /**
     * One term of the search, matched against exactly the columns the নবজাতক তালিকা shows — the
     * registration number, child, mother, father, উপজেলা, union and ward — and nothing else, so a
     * hit is always visible in the row it returns.
     *
     * The number columns are typed as they are displayed, in Bengali digits, so those are folded
     * to ASCII first. Status is a tab, not a search term.
     */
    private function searchClause(Builder $w, string $q): Builder
    {
        $like = '%'.$q.'%';
        $digits = $this->asciiDigits($q);

        return $w
            ->where('child_name', 'ilike', $like)
            ->orWhere('mother_name', 'ilike', $like)
            ->orWhere('father_name', 'ilike', $like)
            ->orWhere('registration_no', 'ilike', '%'.$digits.'%')
            ->when(ctype_digit($digits), fn ($b) => $b->orWhere('ward_no', (int) $digits))
            ->orWhereHas('union', fn ($u) => $u->where('name_bn', 'ilike', $like)->orWhere('name', 'ilike', $like))
            ->orWhereHas('upazila', fn ($t) => $t->where('name_bn', 'ilike', $like)->orWhere('name', 'ilike', $like));
    }

    /** All three tab totals in one grouped pass instead of three scans of the same rows. */
    private function tabCounts($base): array
    {
        $totals = (clone $base)
            ->reorder()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $of = fn (string $key) => (int) ($totals[$key] ?? 0);

        return [
            ['key' => 'all', 'total' => $of('pending_entry') + $of('entered')],
            ['key' => 'pending_entry', 'total' => $of('pending_entry')],
            ['key' => 'entered', 'total' => $of('entered')],
        ];
    }

    public function show(BirthRegistration $birthRegistration): BirthRegistrationResource
    {
        return new BirthRegistrationResource($birthRegistration->load('union', 'upazila', 'pregnancy'));
    }

    /** Manual entry (§8.2) — created জন্মনিবন্ধন সম্পন্ন হয়নি until submitted to BDRIS. */
    public function store(Request $request): BirthRegistrationResource
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        $data = $request->validate([
            'child_name' => ['nullable', 'string', 'max:120'],
            'mother_name' => ['required', 'string', 'max:120'],
            'father_name' => ['nullable', 'string', 'max:120'],
            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'date_of_birth' => ['nullable', 'date'],
            'sex' => ['nullable', 'in:male,female'],
        ]);
        $data['created_by'] = $request->user()->id;
        // A সচিব only ever sees their own union (RoleVisibilityScope), so a manual entry filed
        // without one would vanish the moment it was saved. Default it to theirs.
        $data['union_id'] ??= $request->user()->union_id;

        $reg = BirthRegistration::create($data);

        return new BirthRegistrationResource($reg->load('union'));
    }

    /**
     * Sochib approval of a delivered pregnancy → auto-submit to BDRIS → certificate (§8.1 step 4–5).
     */
    /**
     * The certificate form the সচিব opens from a delivered pregnancy: every field prefilled from
     * the mother's record, blank where she never gave one. Returned rather than assembled in the
     * browser so the derived parts (place of birth, permanent address) are computed once, here.
     */
    public function draftFromPregnancy(Pregnancy $pregnancy): JsonResponse
    {
        abort_unless($pregnancy->isDelivered(), 422, 'ডেলিভারি নিশ্চিত না হলে জন্ম নিবন্ধন করা যাবে না।');

        // Already filed with BDRIS → show what was filed, not a fresh draft (approval is
        // idempotent). A row merely waiting in the নবজাতক তালিকা since the delivery was confirmed
        // is not "filed": the সচিব still gets the editable draft.
        $filed = $pregnancy->birthRegistration?->isEntered() ? $pregnancy->birthRegistration : null;

        return response()->json([
            'data' => $filed
                ? (new BirthRegistrationResource($filed->load('union')))->resolve()
                : $this->service->draftFor($pregnancy),
            'already_registered' => (bool) $filed,
        ]);
    }

    public function approveFromPregnancy(Request $request, Pregnancy $pregnancy): BirthRegistrationResource
    {
        abort_unless($pregnancy->isDelivered(), 422, 'ডেলিভারি নিশ্চিত না হলে জন্ম নিবন্ধন করা যাবে না।');

        $overrides = $request->validate($this->certificateRules());

        // An emptied field means "the certificate leaves this blank", not "keep the draft value".
        $overrides = array_map(fn ($v) => $v === '' ? null : $v, $overrides);

        $reg = $this->service->approveFromPregnancy($pregnancy, $overrides, $request->user()->id);

        return new BirthRegistrationResource($reg->load('union'));
    }

    /**
     * The face of the certificate. Everything is optional — a সচিব may have to file with what the
     * family could produce — except the formats, which BDRIS itself rejects: an NID is 10, 13 or
     * 17 digits and a birth-registration number is 17.
     *
     * @return array<string, array<int, mixed>>
     */
    private function certificateRules(): array
    {
        $nid = ['nullable', 'string', 'regex:/^(\d{10}|\d{13}|\d{17})$/'];
        $brn = ['nullable', 'string', 'regex:/^\d{17}$/'];

        return [
            'child_name' => ['nullable', 'string', 'max:120'],
            'child_name_en' => ['nullable', 'string', 'max:120'],
            'date_of_birth' => ['nullable', 'date'],
            'sex' => ['nullable', 'in:male,female'],

            'mother_name' => ['nullable', 'string', 'max:120'],
            'mother_name_en' => ['nullable', 'string', 'max:120'],
            'mother_nid' => $nid,
            'mother_birth_reg_no' => $brn,
            'mother_nationality' => ['nullable', 'string', 'max:60'],

            'father_name' => ['nullable', 'string', 'max:120'],
            'father_name_en' => ['nullable', 'string', 'max:120'],
            'father_nid' => $nid,
            'father_birth_reg_no' => $brn,
            'father_nationality' => ['nullable', 'string', 'max:60'],

            'union_id' => ['nullable', 'integer', 'exists:unions,id'],
            'ward_no' => ['nullable', 'integer', 'min:1', 'max:99'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'permanent_address' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** Submit an existing pending manual entry to BDRIS. */
    public function submit(BirthRegistration $birthRegistration): BirthRegistrationResource
    {
        $reg = $this->service->submitToBdris($birthRegistration);

        return new BirthRegistrationResource($reg->load('union'));
    }

    /** Download the generated certificate. */
    public function downloadCertificate(BirthRegistration $birthRegistration): StreamedResponse
    {
        abort_unless(
            $birthRegistration->certificate_path && Storage::disk('public')->exists($birthRegistration->certificate_path),
            404,
            'সনদ পাওয়া যায়নি।',
        );

        return Storage::disk('public')->download(
            $birthRegistration->certificate_path,
            "birth-certificate-{$birthRegistration->registration_no}.html",
        );
    }
}
