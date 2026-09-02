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
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'নতুন এফডব্লিউএ', 'username' => 'fwa_new', 'password' => 'secret123',
            'role' => 'fwa', 'ward_no' => 4,
        ])->assertCreated()->assertJsonPath('data.role', 'fwa')->assertJsonPath('data.tenant_id', 'galachipa');
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
            'name' => 'y', 'username' => 'fwa_y', 'password' => 'secret123', 'role' => 'fwa', 'tenant_id' => 'dumuria',
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
}
