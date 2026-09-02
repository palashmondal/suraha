<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UpazilaResource;
use App\Models\District;
use App\Models\Union;
use App\Models\UnionRef;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Suraha instance management (§8.6 / §4). SEAL provisions a new upazila = a new tenant + its
 * subdomain, and reviews the roster of existing instances. Route-gated to seal_admin.
 */
class UpazilaController extends Controller
{
    /** All Suraha instances with division, district and status, for the admin listing table. */
    public function index()
    {
        $upazilas = Upazila::query()
            ->with('district.division')
            ->orderBy('name_bn')
            ->get();

        return UpazilaResource::collection($upazilas);
    }

    /**
     * Provision a new upazila (tenant) + subdomain, and auto-create its default officer accounts:
     * the UNO always, and a DC only if the district has none yet (a DC oversees the whole district).
     * The generated temp passwords are returned ONCE — they are hashed at rest and never re-shown.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            // slug == tenant id == subdomain label (e.g. "kalapara" -> kalapara.suraha.net)
            'slug' => [
                'required', 'string', 'max:63', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('tenants', 'id'),
                Rule::unique('domains', 'domain'),
            ],
            'name' => ['required', 'string', 'max:120'],
            'name_bn' => ['required', 'string', 'max:120'],
            // Either pick an existing district or create one inline.
            'district_id' => ['nullable', 'integer', Rule::exists('districts', 'id'), 'required_without:district_name'],
            'district_name' => ['nullable', 'string', 'max:120', 'required_without:district_id'],
            'district_name_bn' => ['nullable', 'string', 'max:120', 'required_with:district_name'],
            // A hand-added district still needs its division, or it renders blank in the roster.
            'division_id' => ['nullable', 'integer', Rule::exists('divisions', 'id'), 'required_with:district_name'],
        ]);

        [$upazila, $credentials] = DB::transaction(function () use ($data) {
            $district = isset($data['district_id'])
                ? District::findOrFail($data['district_id'])
                : District::firstOrCreate(
                    ['name' => $data['district_name']],
                    ['name_bn' => $data['district_name_bn'], 'division_id' => $data['division_id'] ?? null],
                );

            $upazila = Upazila::create([
                'id' => $data['slug'],
                'name' => $data['name'],
                'name_bn' => $data['name_bn'],
                'district_id' => $district->id,
            ]);
            $upazila->domains()->create(['domain' => $data['slug']]);

            // Give the new instance its real unions straight away. They are what an FWA or UP
            // Sochib is posted to and what every pregnancy, complaint and appointment is filed
            // under, so an upazila with an empty union list cannot actually be worked.
            $this->seedUnions($upazila);

            $credentials = [];

            // UNO — one per upazila, always.
            $credentials[] = $this->provisionOfficer(
                'uno_'.$data['slug'],
                'ইউএনও, '.$upazila->name_bn,
                Role::UNO,
                tenantId: $upazila->id,
                designation: 'উপজেলা নির্বাহী কর্মকর্তা',
            );

            // DC — one per district; create only if this district has none yet.
            $hasDc = User::where('role', Role::DC->value)->where('district_id', $district->id)->exists();
            if (! $hasDc) {
                $credentials[] = $this->provisionOfficer(
                    'dc_'.Str::slug($district->name),
                    'জেলা প্রশাসক, '.$district->name_bn,
                    Role::DC,
                    districtId: $district->id,
                    designation: 'জেলা প্রশাসক',
                );
            }

            return [$upazila, $credentials];
        });

        return response()->json([
            'data' => new UpazilaResource($upazila->load('district.division')),
            'credentials' => $credentials, // shown once — save now
        ], 201);
    }

    /**
     * Copy an upazila's unions from the national catalogue into its own tenant-scoped table.
     * Idempotent, so re-running it on an existing instance fills gaps without duplicating.
     */
    public function seedUnions(Upazila $upazila): int
    {
        $refs = UnionRef::whereHas('upazilaRef', fn ($q) => $q->where('slug', $upazila->getTenantKey()))
            ->orderBy('name')
            ->get();

        $existing = Union::where('tenant_id', $upazila->getTenantKey())->pluck('name')->all();
        $new = $refs->reject(fn (UnionRef $r) => in_array($r->name, $existing, true));

        foreach ($new as $ref) {
            // tenant_id is not fillable, and BelongsToTenant only auto-fills it from an
            // initialized tenant — which there is none of on the central host where SEAL
            // provisions. So set it on the instance rather than passing it to create().
            $union = new Union([
                'name' => $ref->name,
                'name_bn' => $ref->name_bn,
                'type' => 'union',
                'ward_count' => 9,
            ]);
            $union->tenant_id = $upazila->getTenantKey();
            $union->save();
        }

        return $new->count();
    }

    /**
     * Create an officer with a generated temporary password; returns the plaintext for one-time
     * display (never stored or logged in plaintext).
     */
    private function provisionOfficer(
        string $username,
        string $name,
        Role $role,
        ?string $tenantId = null,
        ?int $districtId = null,
        ?string $designation = null,
    ): array {
        $password = Str::password(12, symbols: false);

        User::create([
            'name' => $name,
            'username' => $username,
            'password' => Hash::make($password),
            'role' => $role->value,
            'tenant_id' => $tenantId,
            'district_id' => $districtId,
            'designation' => $designation,
            'is_active' => true,
        ]);

        return [
            'username' => $username,
            'role' => $role->value,
            'role_label' => $role->labelBn(),
            'temp_password' => $password,
        ];
    }

    /** Single instance (used by the edit page). */
    public function show(Upazila $upazila): UpazilaResource
    {
        return new UpazilaResource($upazila->load('district.division'));
    }

    /**
     * Edit an instance: display name (Bangla/English), its district, and active status. The slug
     * (tenant id == subdomain label) is the immutable identity of the tenant and its data, so it
     * is NOT editable here.
     */
    public function update(Request $request, Upazila $upazila): UpazilaResource
    {
        // Only the active flag is editable. Name and district come from the national catalogue and
        // define which real upazila this instance IS — editing them would silently repoint a live
        // subdomain at a different place. To correct a mistake, delete the instance and recreate it.
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $upazila->update($data);

        return new UpazilaResource($upazila->load('district.division'));
    }

    /**
     * Delete an instance and everything scoped to it. All tenant-owned tables FK their tenant_id
     * with cascadeOnDelete, so deleting the tenant row removes its unions, pregnancies, birth
     * registrations, complaints, appointments, notifications, sliders, general info, and domain.
     * Users are the one exception (tenant_id is a plain indexed column, no FK), so they are
     * removed explicitly first.
     */
    public function destroy(Upazila $upazila): JsonResponse
    {
        DB::transaction(function () use ($upazila) {
            User::where('tenant_id', $upazila->id)->delete();
            $upazila->delete(); // cascades domains + every tenant-owned module table
        });

        return response()->json(['message' => 'উপজেলা ইনস্ট্যান্স মুছে ফেলা হয়েছে।']);
    }
}
