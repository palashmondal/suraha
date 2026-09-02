<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Resources\UserResource;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Officer management (কর্মকর্তা → পদবী / কর্মকর্তা তালিকা, §8.6).
 *
 * - SEAL Admin: create ANY officer role in ANY upazila, and toggle anyone active/inactive.
 * - UNO: create only upazila-level staff (FWA / UP Sochib / Investigating Officer) within THEIR
 *   own upazila, and toggle those accounts. A UNO can never create/mutate a UNO, DC, or SEAL, nor
 *   provision into another upazila (tenant_id is forced to the UNO's own).
 */
class OfficerController extends Controller
{
    /** Roles a UNO may assign (upazila-level staff only). */
    private const UNO_ASSIGNABLE = [Role::FWA, Role::UP_SOCHIB, Role::INVESTIGATING_OFFICER];

    /**
     * Everyone attached to one upazila: its officers, its citizens, and the DC of its district —
     * who carries no tenant_id but oversees the upazila, so a tenant_id filter alone would hide
     * them. SEAL sees all of that; a UNO sees only the staff they may actually manage.
     *
     * Filtering is done in SQL rather than in the browser because the citizen rows grow without
     * bound as the public files complaints and books appointments.
     */
    public function directory(Request $request)
    {
        $tenantId = tenancy()->initialized
            ? tenant()->getTenantKey()
            : $request->user()->tenant_id;

        abort_unless($tenantId, 422, 'কোন উপজেলার তালিকা দেখতে চান তা নির্বাচন করুন।');

        $districtId = Upazila::find($tenantId)?->district_id;

        $actor = $request->user();

        $users = User::query()
            ->where(function ($w) use ($tenantId, $districtId) {
                $w->where('tenant_id', $tenantId)
                    ->orWhere(fn ($d) => $d->where('role', Role::DC->value)->where('district_id', $districtId));
            })
            // A UNO manages the staff below them, not their own account or the DC's — those are
            // edited from the UNO's profile and the SEAL console respectively. Listing rows a UNO
            // cannot act on would only invite a 403 (authorizeManage refuses them anyway).
            ->when(
                $actor->role === Role::UNO,
                fn ($q) => $q->whereNotIn('role', [Role::UNO->value, Role::DC->value]),
            )
            ->when($request->query('role'), fn ($q, $role) => $q->where('role', $role))
            ->when($request->query('q'), function ($q, $term) {
                $like = '%'.$term.'%';
                $q->where(fn ($w) => $w->where('name', 'like', $like)
                    ->orWhere('name_en', 'like', $like)
                    ->orWhere('username', 'like', $like)
                    ->orWhere('phone', 'like', $like));
            })
            ->with('upazila')
            ->orderBy('role')
            ->orderBy('name')
            // ponytail: flat cap, no paging. Swap to paginate() when one upazila passes ~500 users.
            ->limit(500)
            ->get();

        return UserResource::collection($users);
    }

    public function index(Request $request)
    {
        $actor = $request->user();

        $officers = User::query()
            ->where('role', '!=', Role::CITIZEN->value)
            ->when($actor->role === Role::UNO, fn ($q) => $q->where('tenant_id', $actor->tenant_id))
            ->when(
                $actor->role === Role::SEAL_ADMIN && $request->query('tenant_id'),
                fn ($q, $t) => $q->where('tenant_id', $request->query('tenant_id')),
            )
            ->with('upazila')
            ->orderBy('name')
            ->paginate(20);

        return UserResource::collection($officers);
    }

    /** Roles the current actor is allowed to assign — drives the create form's role dropdown. */
    public function assignableRoles(Request $request): JsonResponse
    {
        $roles = $this->assignableFor($request->user());

        return response()->json([
            'roles' => array_map(fn (Role $r) => ['value' => $r->value, 'label' => $r->labelBn()], $roles),
        ]);
    }

    public function store(Request $request): UserResource
    {
        $actor = $request->user();
        $isUno = $actor->role === Role::UNO;
        $assignable = array_map(fn (Role $r) => $r->value, $this->assignableFor($actor));

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'name_en' => ['nullable', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:60', Rule::unique('users', 'username')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in($assignable)],
            'designation' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'regex:/^01[0-9]{9}$/', Rule::unique('users', 'phone')],
            'email' => ['required', 'email', 'max:120', Rule::unique('users', 'email')],
            'is_active' => ['nullable', 'boolean'],
            'tenant_id' => ['nullable', 'string', Rule::exists('tenants', 'id')],
            'district_id' => ['nullable', 'integer', Rule::exists('districts', 'id')],
            // Where an officer works is part of who they are: a UP Sochib serves one union, and an
            // FWA one ward within it. Without these the record cannot be routed to, so they are
            // required for those two roles and rejected as noise for the rest.
            'union_id' => [
                Rule::requiredIf(fn () => in_array($request->input('role'), [Role::FWA->value, Role::UP_SOCHIB->value], true)),
                'nullable', 'integer', Rule::exists('unions', 'id'),
            ],
            'ward_no' => [
                Rule::requiredIf(fn () => $request->input('role') === Role::FWA->value),
                'nullable', 'integer', 'min:1', 'max:99',
            ],
        ]);

        $role = Role::from($data['role']);

        if ($isUno) {
            // Force own upazila; a UNO can never provision elsewhere or set a district.
            $data['tenant_id'] = $actor->tenant_id;
            $data['district_id'] = null;
        } else {
            // SEAL: enforce scope integrity per role.
            if ($role->scope() === 'tenant' && empty($data['tenant_id'])) {
                abort(422, 'এই পদবির জন্য উপজেলা নির্ধারণ করা আবশ্যক।');
            }
            if ($role === Role::DC && empty($data['district_id'])) {
                abort(422, 'জেলা প্রশাসকের জন্য জেলা নির্ধারণ করা আবশ্যক।');
            }
            if ($role === Role::SEAL_ADMIN) {
                $data['tenant_id'] = null;
            }
        }

        // One serving UNO per upazila. Every upazila is provisioned with one already, so this
        // normally blocks a duplicate; a deactivated predecessor is ignored, which is what makes
        // a handover possible without first deleting the outgoing officer's account.
        if ($role === Role::UNO) {
            $taken = User::where('role', Role::UNO->value)
                ->where('tenant_id', $data['tenant_id'])
                ->where('is_active', true)
                ->exists();

            if ($taken) {
                throw ValidationException::withMessages([
                    'role' => ['এই উপজেলায় ইতিমধ্যে একজন সক্রিয় ইউএনও রয়েছেন। নতুন ইউএনও যুক্ত করার আগে পূর্বেরজনকে নিষ্ক্রিয় করুন।'],
                ]);
            }
        }

        $data['password'] = Hash::make($data['password']);
        $data['is_active'] = $data['is_active'] ?? true;

        $officer = User::create($data);

        return new UserResource($officer->load('upazila'));
    }

    /**
     * The current upazila's investigating officers (তদন্ত কর্মকর্তা তালিকা) — the pool the UNO/SEAL
     * assign to complaints. Tenant-scoped: resolved from the subdomain, or from the SEAL's selected
     * upazila (X-Upazila) on the central host.
     */
    public function investigators()
    {
        $tenantId = $this->currentTenantId();

        $officers = User::query()
            ->where('role', Role::INVESTIGATING_OFFICER->value)
            ->where('tenant_id', $tenantId)
            ->with('upazila')
            ->orderBy('name')
            ->paginate(20);

        return UserResource::collection($officers);
    }

    /**
     * Add an investigating officer. The mobile number IS the account identity (username = mobile),
     * so a login account is created for it with a one-time temporary password (returned once).
     * Role is fixed to Investigating Officer and the upazila is the current tenant context.
     */
    public function storeInvestigator(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'designation' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:160'],
            'phone' => [
                'required', 'string', 'regex:/^01[0-9]{9}$/',
                Rule::unique('users', 'phone'),
                Rule::unique('users', 'username'),
            ],
        ]);

        $password = Str::password(10, symbols: false);

        $officer = User::create([
            'name' => $data['name'],
            'designation' => $data['designation'] ?? null,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'],
            'username' => $data['phone'],      // the mobile number is the login identity
            'password' => Hash::make($password),
            'role' => Role::INVESTIGATING_OFFICER->value,
            'tenant_id' => $tenantId,
            'is_active' => true,
        ]);

        return response()->json([
            'data' => new UserResource($officer->load('upazila')),
            'credentials' => ['username' => $data['phone'], 'temp_password' => $password], // shown once
        ], 201);
    }

    /**
     * Edit an existing account's contact details, posting and password.
     *
     * Username and role are deliberately NOT editable: the username is the login and the
     * identifier every other screen refers to, and the role decides what the account may do.
     * Changing either would silently turn one person's account into another's, so a wrong role
     * means deactivate and create — which leaves the original record intact for anything it
     * already signed off on.
     */
    public function update(Request $request, User $officer): UserResource
    {
        abort_if($officer->role === Role::CITIZEN, 404);
        $this->authorizeManage($request->user(), $officer);

        // Posting requirements follow the account's own role, not anything the client sends.
        $needsUnion = in_array($officer->role, [Role::FWA, Role::UP_SOCHIB], true);
        $needsWard = $officer->role === Role::FWA;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'designation' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'regex:/^01[0-9]{9}$/', Rule::unique('users', 'phone')->ignore($officer->id)],
            'email' => ['required', 'email', 'max:120', Rule::unique('users', 'email')->ignore($officer->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'is_active' => ['nullable', 'boolean'],
            'union_id' => [$needsUnion ? 'required' : 'nullable', 'nullable', 'integer', Rule::exists('unions', 'id')],
            'ward_no' => [$needsWard ? 'required' : 'nullable', 'nullable', 'integer', 'min:1', 'max:99'],
        ]);

        // An empty password box means "leave it alone", not "blank the password".
        if (empty($data['password'])) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }

        $officer->update($data);

        return new UserResource($officer->load('upazila'));
    }

    public function updateStatus(Request $request, User $officer): UserResource
    {
        abort_if($officer->role === Role::CITIZEN, 404);
        $this->authorizeManage($request->user(), $officer);

        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $officer->update($data);

        return new UserResource($officer->load('upazila'));
    }

    // ---- helpers ---------------------------------------------------------

    /** The upazila an investigating officer is being managed for; requires a tenant context. */
    private function currentTenantId(): string
    {
        abort_unless(
            tenancy()->initialized,
            400,
            'কোন উপজেলার জন্য কর্মকর্তা যুক্ত করবেন তা নির্ধারণ করুন — উপরের তালিকা থেকে একটি উপজেলা নির্বাচন করুন।',
        );

        return tenant()->getTenantKey();
    }

    /** @return array<int,Role> */
    private function assignableFor(User $actor): array
    {
        return $actor->role === Role::UNO
            ? self::UNO_ASSIGNABLE
            : Role::assignableOfficerRoles();
    }

    /** A UNO may only manage upazila-level staff within their own upazila. */
    private function authorizeManage(User $actor, User $officer): void
    {
        if ($actor->role !== Role::UNO) {
            return; // SEAL
        }

        abort_unless(
            $officer->tenant_id === $actor->tenant_id && in_array($officer->role, self::UNO_ASSIGNABLE, true),
            403,
            'এই কর্মকর্তার উপর আপনার নিয়ন্ত্রণ নেই।',
        );
    }
}
