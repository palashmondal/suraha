<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\BirthRegistrationResource;
use App\Models\BirthRegistration;
use App\Models\Pregnancy;
use App\Services\Bdris\BirthRegistrationService;
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

    /** List with সকল / কার্যকর কিন্তু এন্ট্রি হয়নি / কার্যকর তালিকা tabs, counts, search. */
    public function index(Request $request): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        $status = $request->query('status', 'all');
        $q = trim((string) $request->query('q', ''));

        $base = BirthRegistration::query()
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w
                ->where('child_name', 'like', "%{$q}%")
                ->orWhere('mother_name', 'like', "%{$q}%")
                ->orWhere('father_name', 'like', "%{$q}%")
                ->orWhere('registration_no', 'like', "%{$q}%")));

        $list = (clone $base)
            ->when(in_array($status, ['pending_entry', 'entered'], true), fn ($b) => $b->where('status', $status))
            ->with('union')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => BirthRegistrationResource::collection($list->items()),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'total' => $list->total(),
            ],
            'tabs' => [
                ['key' => 'all', 'total' => (clone $base)->count()],
                ['key' => 'pending_entry', 'total' => (clone $base)->where('status', 'pending_entry')->count()],
                ['key' => 'entered', 'total' => (clone $base)->where('status', 'entered')->count()],
            ],
        ]);
    }

    public function show(BirthRegistration $birthRegistration): BirthRegistrationResource
    {
        return new BirthRegistrationResource($birthRegistration->load('union', 'pregnancy'));
    }

    /** Manual entry (§8.2) — created কার্যকর কিন্তু এন্ট্রি হয়নি until submitted to BDRIS. */
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

        $reg = BirthRegistration::create($data);

        return new BirthRegistrationResource($reg->load('union'));
    }

    /**
     * Sochib approval of a delivered pregnancy → auto-submit to BDRIS → certificate (§8.1 step 4–5).
     */
    public function approveFromPregnancy(Request $request, Pregnancy $pregnancy): BirthRegistrationResource
    {
        abort_unless($pregnancy->isDelivered(), 422, 'ডেলিভারি নিশ্চিত না হলে জন্ম নিবন্ধন করা যাবে না।');

        $overrides = $request->validate([
            'child_name' => ['nullable', 'string', 'max:120'],
            'father_name' => ['nullable', 'string', 'max:120'],
        ]);

        $reg = $this->service->approveFromPregnancy($pregnancy, $overrides, $request->user()->id);

        return new BirthRegistrationResource($reg->load('union'));
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
