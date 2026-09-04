<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Officer management RBAC (§8.6): SEAL manages anyone anywhere; a UNO manages only upazila-level
 * staff (FWA / Sochib / Investigator) within their own upazila.
 */
class OfficerManagementTest extends TestCase
{
    use RefreshDatabase;

    private const GALACHIPA = 'http://galachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function uno(): User
    {
        return User::where('username', 'uno_galachipa')->firstOrFail();
    }

    /** SEAL on সকল উপজেলা (no tenant resolved) must still see every upazila's investigators. */
    public function test_seal_lists_investigators_across_all_upazilas(): void
    {
        Sanctum::actingAs(User::where('role', 'seal_admin')->firstOrFail());

        $tenants = collect($this->getJson('http://lvh.me/api/investigating-officers')
            ->assertOk()->json('data'))->pluck('upazila')->unique();

        $this->assertGreaterThan(1, $tenants->count());
    }

    public function test_uno_only_sees_own_upazila_officers(): void
    {
        Sanctum::actingAs($this->uno());
        $res = $this->getJson(self::GALACHIPA.'/api/officers')->assertOk();

        foreach ($res->json('data') as $officer) {
            $this->assertSame('galachipa', $officer['tenant_id']);
        }
    }

    public function test_uno_assignable_roles_are_upazila_staff_only(): void
    {
        Sanctum::actingAs($this->uno());
        $roles = collect($this->getJson(self::GALACHIPA.'/api/officer-roles')->json('roles'))->pluck('value')->all();

        $this->assertEqualsCanonicalizing(['fwa', 'up_sochib', 'investigating_officer'], $roles);
    }

    public function test_uno_can_create_an_fwa_in_own_upazila(): void
    {
        Sanctum::actingAs($this->uno());
        $union = \App\Models\Union::where('tenant_id', 'galachipa')->firstOrFail();

        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'নতুন এফডব্লিউএ', 'username' => 'fwa_new', 'password' => 'secret123',
            'role' => 'fwa', 'designation' => 'পরিবার কল্যাণ সহকারী',
            'phone' => '01711111111', 'email' => 'fwa.new@example.com',
            'union_id' => $union->id, 'ward_no' => 4,
        ])->assertCreated()->assertJsonPath('data.role', 'fwa')->assertJsonPath('data.tenant_id', 'galachipa');

        // An FWA is placed in a ward of a union — both are required, so a missing one is refused.
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'ওয়ার্ডবিহীন', 'username' => 'fwa_noward', 'password' => 'secret123',
            'role' => 'fwa', 'designation' => 'পরিবার কল্যাণ সহকারী',
            'phone' => '01711111112', 'email' => 'fwa.noward@example.com',
            'union_id' => $union->id,
        ])->assertStatus(422)->assertJsonValidationErrors('ward_no');

        // A UP Sochib serves a whole union, so the union alone is required — no ward.
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'নতুন সচিব', 'username' => 'sochib_new', 'password' => 'secret123',
            'role' => 'up_sochib', 'designation' => 'ইউপি সচিব',
            'phone' => '01711111113', 'email' => 'sochib.new@example.com',
            'union_id' => $union->id,
        ])->assertCreated()->assertJsonPath('data.role', 'up_sochib');
    }

    public function test_uno_cannot_create_a_uno_or_dc(): void
    {
        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'x', 'username' => 'uno_x', 'password' => 'secret123', 'role' => 'uno', 'tenant_id' => 'galachipa',
        ])->assertStatus(422); // role not in the UNO-assignable set
    }

    public function test_uno_cannot_provision_into_another_upazila(): void
    {
        Sanctum::actingAs($this->uno());
        // Even if a different tenant_id is passed, it is forced to the UNO's own upazila.
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'y', 'username' => 'fwa_y', 'password' => 'secret123', 'role' => 'fwa',
            'designation' => 'পরিবার কল্যাণ সহকারী', 'phone' => '01722222222', 'email' => 'fwa.y@example.com',
            'union_id' => \App\Models\Union::where('tenant_id', 'galachipa')->value('id'), 'ward_no' => 2,
            'tenant_id' => 'dumuria',
        ])->assertCreated()->assertJsonPath('data.tenant_id', 'galachipa');
    }

    public function test_uno_cannot_toggle_an_officer_from_another_upazila(): void
    {
        // Seed a UNO for Dumuria to attempt cross-upazila mutation against.
        $dumuriaFwa = User::create([
            'name' => 'ডুমুরিয়া এফডব্লিউএ', 'username' => 'fwa_dumuria', 'password' => bcrypt('secret123'),
            'role' => Role::FWA->value, 'tenant_id' => 'dumuria', 'is_active' => true,
        ]);

        Sanctum::actingAs($this->uno());
        $this->patchJson(self::GALACHIPA."/api/officers/{$dumuriaFwa->id}/status", ['is_active' => false])
            ->assertStatus(403);
    }

    public function test_uno_can_deactivate_own_officer(): void
    {
        $fwa = User::where('username', 'fwa_galachipa')->firstOrFail();
        Sanctum::actingAs($this->uno());
        $this->patchJson(self::GALACHIPA."/api/officers/{$fwa->id}/status", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
    }

    /** Every upazila is provisioned with a UNO, so a second serving one must be refused. */
    public function test_only_one_active_uno_per_upazila(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());

        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'দ্বিতীয় ইউএনও', 'username' => 'uno_two', 'password' => 'password123', 'role' => 'uno',
            'designation' => 'উপজেলা নির্বাহী কর্মকর্তা', 'phone' => '01733333333', 'email' => 'uno.two@example.com',
        ])->assertStatus(422)->assertJsonValidationErrors('role');

        // Deactivate the serving one and the seat frees up — a handover, not a deletion.
        $serving = User::where('username', 'uno_galachipa')->firstOrFail();
        $serving->update(['is_active' => false]);

        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'দ্বিতীয় ইউএনও', 'username' => 'uno_two', 'password' => 'password123',
            'role' => 'uno', 'designation' => 'উপজেলা নির্বাহী কর্মকর্তা',
            'phone' => '01733333333', 'email' => 'uno.two@example.com', 'tenant_id' => 'galachipa',
        ])->assertCreated();
    }

    /** SEAL sees the whole upazila: its staff, its citizens, and its district's DC. */
    public function test_seal_directory_covers_the_upazila_and_its_dc(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());

        $roles = collect($this->getJson(self::GALACHIPA.'/api/users')->assertOk()->json('data'))
            ->pluck('role');

        foreach (['uno', 'up_sochib', 'fwa', 'investigating_officer', 'citizen', 'dc'] as $role) {
            $this->assertContains($role, $roles, "directory is missing {$role}");
        }

        $this->getJson(self::GALACHIPA.'/api/users?role=dc')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.role', 'dc');
    }

    /**
     * A UNO's directory omits their own account and the DC's: neither is theirs to edit — the
     * UNO uses their profile, the DC is managed from the SEAL console. authorizeManage refuses
     * both anyway, so listing them would only offer a row that 403s.
     */
    public function test_uno_directory_hides_the_uno_and_the_dc(): void
    {
        Sanctum::actingAs($this->uno());

        $roles = collect($this->getJson(self::GALACHIPA.'/api/users')->assertOk()->json('data'))
            ->pluck('role');

        $this->assertNotContains('dc', $roles);
        $this->assertNotContains('uno', $roles);
        foreach (['up_sochib', 'fwa', 'investigating_officer', 'citizen'] as $role) {
            $this->assertContains($role, $roles, "directory is missing {$role}");
        }

        // Another upazila's staff never appear either.
        $this->assertNotContains(
            'dumuria',
            collect($this->getJson(self::GALACHIPA.'/api/users')->json('data'))->pluck('tenant_id'),
        );
    }

    /** Only SEAL may touch a DC account; a UNO is refused even by id. */
    public function test_uno_cannot_edit_the_dc(): void
    {
        $dc = User::where('username', 'dc_patuakhali')->firstOrFail();

        Sanctum::actingAs($this->uno());
        $this->putJson(self::GALACHIPA."/api/officers/{$dc->id}", [
            'name' => 'x', 'designation' => 'y', 'phone' => '01788880001', 'email' => 'dc.hijack@example.com',
        ])->assertStatus(403);

        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        $this->putJson(self::GALACHIPA."/api/officers/{$dc->id}", [
            'name' => 'জেলা প্রশাসক', 'designation' => 'জেলা প্রশাসক',
            'phone' => '01788880002', 'email' => 'dc.patuakhali@example.com',
        ])->assertOk();
    }

    /**
     * Editing an account changes how to reach someone and where they serve — never who they are.
     * Username and role are the identity every other screen refers to, so they stay put.
     */
    public function test_editing_an_officer_keeps_username_and_role_fixed(): void
    {
        $union = \App\Models\Union::where('tenant_id', 'galachipa')->firstOrFail();
        $fwa = User::where('username', 'fwa_galachipa')->firstOrFail();
        $original = ['username' => $fwa->username, 'role' => $fwa->role->value];

        Sanctum::actingAs($this->uno());
        $this->putJson(self::GALACHIPA."/api/officers/{$fwa->id}", [
            'name' => 'সংশোধিত নাম',
            'designation' => 'পরিবার কল্যাণ সহকারী',
            'phone' => '01799990001',
            'email' => 'edited.fwa@example.com',
            'union_id' => $union->id,
            'ward_no' => 7,
            // Ignored: identity is not editable.
            'username' => 'hijacked',
            'role' => 'uno',
        ])->assertOk()
            ->assertJsonPath('data.name', 'সংশোধিত নাম')
            ->assertJsonPath('data.ward_no', 7)
            ->assertJsonPath('data.username', $original['username'])
            ->assertJsonPath('data.role', $original['role']);
    }

    /** An empty password box means "leave it", not "blank it". */
    public function test_editing_without_a_password_leaves_the_old_one_working(): void
    {
        $union = \App\Models\Union::where('tenant_id', 'galachipa')->firstOrFail();
        $sochib = User::where('username', 'sochib_galachipa')->firstOrFail();

        Sanctum::actingAs($this->uno());
        $this->putJson(self::GALACHIPA."/api/officers/{$sochib->id}", [
            'name' => $sochib->name, 'designation' => 'ইউপি সচিব',
            'phone' => '01799990002', 'email' => 'sochib.edited@example.com',
            'union_id' => $union->id, 'password' => '',
        ])->assertOk();

        $this->postJson(self::GALACHIPA.'/api/auth/officer/login', [
            'username' => 'sochib_galachipa', 'password' => 'password',
        ])->assertOk();
    }

    /** A UNO may not reach into another upazila's staff. */
    public function test_uno_cannot_edit_an_officer_from_another_upazila(): void
    {
        $outsider = User::create([
            'name' => 'ডুমুরিয়া কর্মকর্তা', 'username' => 'fwa_out', 'password' => bcrypt('secret123'),
            'role' => 'fwa', 'tenant_id' => 'dumuria', 'is_active' => true,
        ]);

        Sanctum::actingAs($this->uno());
        $this->putJson(self::GALACHIPA."/api/officers/{$outsider->id}", [
            'name' => 'x', 'designation' => 'y', 'phone' => '01799990003', 'email' => 'out@example.com',
        ])->assertStatus(403);
    }

    /**
     * SEAL with no upazila selected is the "সকল উপজেলা" view: every upazila at once, not an
     * error. It returned 422 before, which the console rendered as an empty table.
     */
    public function test_seal_directory_spans_every_upazila_when_none_is_selected(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());

        // Only Galachipa is seeded with staff, so give Dumuria one to prove the roll-up spans
        // upazilas rather than happening to show a single tenant's rows.
        User::create([
            'name' => 'ডুমুরিয়া কর্মকর্তা', 'username' => 'fwa_dum', 'password' => bcrypt('secret123'),
            'role' => 'fwa', 'tenant_id' => 'dumuria', 'is_active' => true,
        ]);

        $rows = collect($this->getJson('http://lvh.me/api/users')->assertOk()->json('data'));

        $this->assertContains('galachipa', $rows->pluck('tenant_id'));
        $this->assertContains('dumuria', $rows->pluck('tenant_id'));
        // Cross-tenant accounts have no tenant of their own but still belong in the roll-up.
        $this->assertContains('dc', $rows->pluck('role'));

        // Picking one upazila narrows it back down.
        $narrowed = collect(
            $this->getJson('http://lvh.me/api/users', ['X-Upazila' => 'galachipa'])->assertOk()->json('data')
        );
        $this->assertNotContains('dumuria', $narrowed->pluck('tenant_id'));
        $this->assertLessThan($rows->count(), $narrowed->count());
    }
    /**
     * UNO, DC, সচিব and FWA are posts, not job titles — one active holder per upazila, district,
     * union and ward. A second would receive the same notifications and appear twice in every
     * assignment dropdown.
     */
    public function test_a_second_holder_of_a_single_post_is_refused(): void
    {
        Sanctum::actingAs(User::where('role', 'seal_admin')->firstOrFail());

        $existing = User::where('role', 'up_sochib')->where('tenant_id', 'galachipa')->firstOrFail();

        $body = [
            'name' => 'দ্বিতীয় সচিব',
            'username' => 'sochib_two',
            'password' => 'password123',
            'role' => 'up_sochib',
            'designation' => 'সচিব',
            'phone' => '01799001122',
            'email' => 'sochib.two@example.com',
            'tenant_id' => 'galachipa',
            'union_id' => $existing->union_id,
        ];

        $this->postJson('http://lvh.me/api/officers', $body)
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        // Deactivating the incumbent is what makes a handover possible.
        $existing->forceFill(['is_active' => false])->save();
        $this->postJson('http://lvh.me/api/officers', $body)->assertCreated();
    }
}
