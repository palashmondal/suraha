<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Http\Resources\UserResource;
use App\Models\Upazila;
use App\Models\User;
use App\Support\ScopeResolver;
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
    private const UNO_ASSIGNABLE = [Role::UP_SOCHIB, Role::INVESTIGATING_OFFICER, Role::FWA];

    /**
     * Everyone attached to one upazila: its officers, its citizens, and the DC of its district —
     * who carries no tenant_id but oversees the upazila, so a tenant_id filter alone would hide
     * them. SEAL sees all of that; a UNO sees only the staff they may actually manage. With no
     * upazila selected, SEAL gets every upazila at once.
     *
     * Filtering is done in SQL rather than in the browser because the citizen rows grow without
     * bound as the public files complaints and books appointments.
     */
    public function directory(Request $request)
    {
        $actor = $request->user();
        $tenantId = tenancy()->initialized ? tenant()->getTenantKey() : null;

        abort_if(
            $tenantId === null && $actor->role->scope() === 'tenant',
            422,
            'কোন উপজেলার তালিকা দেখতে চান তা নির্বাচন করুন।',
        );

        $users = User::query()
            // Scope follows what the viewer can reach. With an upazila resolved — a subdomain, or
            // one picked from the switcher — it is that upazila plus the DC who oversees it.
            // Without one, only SEAL gets here (the route is SEAL + UNO, and a UNO always has a
            // subdomain), and SEAL is meant to see every upazila at once.
            ->when($tenantId !== null, function ($q) use ($tenantId) {
                $districtId = Upazila::find($tenantId)?->district_id;

                $q->where(fn ($w) => $w->where('tenant_id', $tenantId)
                    ->orWhere(fn ($d) => $d->where('role', Role::DC->value)->where('district_id', $districtId)));
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
                $q->where(fn ($w) => $w->where('name', 'ilike', $like)
                    ->orWhere('name_en', 'ilike', $like)
                    ->orWhere('username', 'ilike', $like)
                    ->orWhere('phone', 'ilike', $like));
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

        $this->refuseDuplicatePost($role, $data);

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
    public function investigators(Request $request)
    {
        // Whatever the viewer can reach: the resolved upazila, or — for SEAL on সকল উপজেলা —
        // every upazila at once. Demanding a tenant here left the তালিকা blank on the central
        // host, where SEAL has no upazila selected.
        [$tenantIds] = ScopeResolver::resolve($request->user());

        $officers = User::query()
            ->where('role', Role::INVESTIGATING_OFFICER->value)
            ->whereIn('tenant_id', $tenantIds)
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
    /**
     * Four roles are a post, not a job title: an upazila has one serving UNO, a district one DC,
     * a union one সচিব, and a ward one FWA. Creating a second silently produced two accounts that
     * both received the same notifications and both appeared in every assignment dropdown.
     *
     * Only *active* holders count, so a handover is deactivate-then-create rather than requiring
     * the outgoing officer's record to be deleted.
     *
     * @param  array<string, mixed>  $data
     */
    private function refuseDuplicatePost(Role $role, array $data): void
    {
        // [scope columns => the message when it is already filled]
        $posts = [
            Role::UNO->value => [
                ['tenant_id' => $data['tenant_id'] ?? null],
                'এই উপজেলায় ইতিমধ্যে একজন সক্রিয় ইউএনও রয়েছেন। নতুন ইউএনও যুক্ত করার আগে পূর্বেরজনকে নিষ্ক্রিয় করুন।',
            ],
            Role::DC->value => [
                ['district_id' => $data['district_id'] ?? null],
                'এই জেলায় ইতিমধ্যে একজন সক্রিয় জেলা প্রশাসক রয়েছেন। নতুন ডিসি যুক্ত করার আগে পূর্বেরজনকে নিষ্ক্রিয় করুন।',
            ],
            Role::UP_SOCHIB->value => [
                ['tenant_id' => $data['tenant_id'] ?? null, 'union_id' => $data['union_id'] ?? null],
                'এই ইউনিয়নে ইতিমধ্যে একজন সক্রিয় সচিব রয়েছেন। নতুন সচিব যুক্ত করার আগে পূর্বেরজনকে নিষ্ক্রিয় করুন।',
            ],
            Role::FWA->value => [
                [
                    'tenant_id' => $data['tenant_id'] ?? null,
                    'union_id' => $data['union_id'] ?? null,
                    'ward_no' => $data['ward_no'] ?? null,
                ],
                'এই ওয়ার্ডে ইতিমধ্যে একজন সক্রিয় স্বাস্থ্যকর্মী (FWA) রয়েছেন। নতুন জন যুক্ত করার আগে পূর্বেরজনকে নিষ্ক্রিয় করুন।',
            ],
        ];

        if (! isset($posts[$role->value])) {
            return;
        }

        [$scope, $message] = $posts[$role->value];

        $taken = User::query()
            ->where('role', $role->value)
            ->where('is_active', true)
            ->where(function ($q) use ($scope) {
                foreach ($scope as $column => $value) {
                    $q->where($column, $value);
                }
            })
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages(['role' => [$message]]);
        }
    }

    /**
     * Which single-holder posts are already filled, so the create form can mark them before the
     * form is submitted rather than refusing it afterwards. Same rule as refuseDuplicatePost():
     * only active holders count, so a deactivated predecessor leaves the post open.
     */
    public function filledPosts(): JsonResponse
    {
        $held = User::query()
            ->whereIn('role', [Role::UNO->value, Role::DC->value, Role::UP_SOCHIB->value, Role::FWA->value])
            ->where('is_active', true)
            ->get(['role', 'tenant_id', 'district_id', 'union_id', 'ward_no']);

        return response()->json([
            'uno' => $held->where('role', Role::UNO)->pluck('tenant_id')->filter()->values(),
            'dc' => $held->where('role', Role::DC)->pluck('district_id')->filter()->values(),
            // "tenant:union" and "tenant:union:ward" — one string per filled post, so the client
            // tests membership with a Set rather than scanning objects.
            'up_sochib' => $held->where('role', Role::UP_SOCHIB)
                ->map(fn ($u) => $u->tenant_id.':'.$u->union_id)->values(),
            'fwa' => $held->where('role', Role::FWA)
                ->map(fn ($u) => $u->tenant_id.':'.$u->union_id.':'.$u->ward_no)->values(),
        ]);
    }

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
