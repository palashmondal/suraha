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

    /** The directory is the whole upazila: its staff, its citizens, and its district's DC. */
    public function test_user_directory_covers_the_upazila_and_its_dc(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());

        $roles = collect($this->getJson(self::GALACHIPA.'/api/users')->assertOk()->json('data'))
            ->pluck('role');

        foreach (['uno', 'up_sochib', 'fwa', 'investigating_officer', 'citizen', 'dc'] as $role) {
            $this->assertContains($role, $roles, "directory is missing {$role}");
        }

        // Filters narrow it server-side.
        $this->getJson(self::GALACHIPA.'/api/users?role=dc')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.role', 'dc');

        // Another upazila's staff never appear.
        $this->assertNotContains(
            'dumuria',
            collect($this->getJson(self::GALACHIPA.'/api/users')->json('data'))->pluck('tenant_id'),
        );
    }
}
