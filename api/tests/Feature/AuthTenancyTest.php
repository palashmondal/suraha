<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Milestone 2 acceptance: subdomain resolves the upazila; officers/citizens authenticate;
 * RBAC + tenant scope enforced server-side; DC read-only; SEAL cross-tenant. (§13.2)
 */
class AuthTenancyTest extends TestCase
{
    use RefreshDatabase;

    private const GOLACHIPA = 'http://golachipa.lvh.me';
    private const DUMURIA = 'http://dumuria.lvh.me';
    private const CENTRAL = 'http://localhost';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_unknown_subdomain_returns_404(): void
    {
        $this->getJson('http://nowhere.lvh.me/api/registry/current-upazila')
            ->assertNotFound();
    }

    public function test_subdomain_resolves_upazila(): void
    {
        $this->getJson(self::GOLACHIPA.'/api/registry/current-upazila')
            ->assertOk()
            ->assertJsonPath('upazila.id', 'golachipa')
            ->assertJsonPath('upazila.name_bn', 'গলাচিপা');
    }

    public function test_unions_are_tenant_scoped(): void
    {
        // Golachipa has 3 unions, Dumuria 2 — each subdomain sees only its own.
        $this->getJson(self::GOLACHIPA.'/api/registry/unions')
            ->assertOk()->assertJsonCount(3, 'unions');

        $this->getJson(self::DUMURIA.'/api/registry/unions')
            ->assertOk()->assertJsonCount(2, 'unions');
    }

    public function test_officer_can_log_in_on_their_upazila(): void
    {
        $this->postJson(self::GOLACHIPA.'/api/auth/officer/login', [
            'username' => 'uno_golachipa',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('user.role', 'uno')
            ->assertJsonStructure(['token', 'user' => ['id', 'role_label_bn']]);
    }

    public function test_officer_cannot_log_in_on_a_different_upazila(): void
    {
        $this->postJson(self::DUMURIA.'/api/auth/officer/login', [
            'username' => 'uno_golachipa',
            'password' => 'password',
        ])->assertStatus(422);
    }

    public function test_seal_admin_logs_in_on_central_domain(): void
    {
        $this->postJson(self::CENTRAL.'/api/auth/officer/login', [
            'username' => 'admin',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.role', 'seal_admin');
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->postJson(self::GOLACHIPA.'/api/auth/officer/login', [
            'username' => 'uno_golachipa',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_citizen_otp_flow_creates_account_and_returns_token(): void
    {
        $req = $this->postJson(self::GOLACHIPA.'/api/auth/citizen/request-otp', [
            'phone' => '01811111111',
        ])->assertOk();

        $code = $req->json('dev_code');
        $this->assertNotNull($code);

        $this->postJson(self::GOLACHIPA.'/api/auth/citizen/verify-otp', [
            'phone' => '01811111111',
            'code' => $code,
            'name' => 'করিম',
        ])->assertOk()->assertJsonPath('user.role', 'citizen');

        $this->assertDatabaseHas('users', [
            'phone' => '01811111111',
            'role' => 'citizen',
            'tenant_id' => 'golachipa',
        ]);
    }

    public function test_citizen_otp_requires_tenant_context(): void
    {
        $this->postJson(self::CENTRAL.'/api/auth/citizen/request-otp', [
            'phone' => '01811111111',
        ])->assertStatus(400);
    }

    public function test_dc_is_read_only_server_side(): void
    {
        $dc = User::where('username', 'dc_barishal')->first();
        Sanctum::actingAs($dc);

        // A write route must be blocked for the read-only DC regardless of the UI.
        $this->putJson(self::CENTRAL.'/api/profile', ['name' => 'X'])
            ->assertStatus(403);
    }

    public function test_officer_management_is_limited_to_seal_and_uno(): void
    {
        // A field officer (FWA) cannot manage accounts.
        Sanctum::actingAs(User::where('username', 'fwa_golachipa')->first());
        $this->getJson(self::GOLACHIPA.'/api/officers')->assertStatus(403);

        // SEAL can create any role, including a UNO.
        Sanctum::actingAs(User::where('username', 'admin')->first());
        $this->postJson(self::GOLACHIPA.'/api/officers', [
            'name' => 'নতুন কর্মকর্তা',
            'username' => 'new_uno',
            'password' => 'secret123',
            'role' => Role::UNO->value,
            'tenant_id' => 'golachipa',
        ])->assertCreated()->assertJsonPath('data.role', 'uno');
    }

    public function test_seal_can_switch_between_all_upazilas(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->first());
        $this->getJson(self::CENTRAL.'/api/registry/switchable-upazilas')
            ->assertOk()->assertJsonCount(2, 'upazilas');
    }

    public function test_dc_switches_only_within_district(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_barishal')->first());
        // Both seeded upazilas are in Barishal → DC sees both; scope still enforced by district.
        $this->getJson(self::CENTRAL.'/api/registry/switchable-upazilas')
            ->assertOk()->assertJsonCount(2, 'upazilas');
    }
}
