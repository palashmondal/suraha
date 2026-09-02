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

    private const GALACHIPA = 'http://galachipa.lvh.me';
    private const DUMURIA = 'http://dumuria.lvh.me';
    private const CENTRAL = 'http://localhost';
    private const PATUAKHALI = 'http://patuakhali.lvh.me';

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
        $this->getJson(self::GALACHIPA.'/api/registry/current-upazila')
            ->assertOk()
            ->assertJsonPath('upazila.id', 'galachipa')
            ->assertJsonPath('upazila.name_bn', 'গলাচিপা');
    }

    public function test_unions_are_tenant_scoped(): void
    {
        // Counts come from the national catalogue — Galachipa has 12 unions, Dumuria 14 — so this
        // asserts the boundary rather than a hand-picked number: each subdomain sees its own set
        // and none of the other's.
        $galachipa = collect($this->getJson(self::GALACHIPA.'/api/registry/unions')
            ->assertOk()->json('unions'))->pluck('name_bn');
        $dumuria = collect($this->getJson(self::DUMURIA.'/api/registry/unions')
            ->assertOk()->json('unions'))->pluck('name_bn');

        $this->assertNotEmpty($galachipa);
        $this->assertNotEmpty($dumuria);
        $this->assertContains('পানপট্টি', $galachipa);      // a real Galachipa union
        $this->assertEmpty($galachipa->intersect($dumuria), 'one upazila is showing another\'s unions');
    }

    public function test_officer_can_log_in_on_their_upazila(): void
    {
        $this->postJson(self::GALACHIPA.'/api/auth/officer/login', [
            'username' => 'uno_galachipa',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('user.role', 'uno')
            ->assertJsonStructure(['token', 'user' => ['id', 'role_label_bn']]);
    }

    public function test_officer_cannot_log_in_on_a_different_upazila(): void
    {
        $this->postJson(self::DUMURIA.'/api/auth/officer/login', [
            'username' => 'uno_galachipa',
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

    public function test_seal_admin_cannot_log_in_on_a_upazila_subdomain(): void
    {
        // Admin login is central-only; the upazila host must reject SEAL.
        $this->postJson(self::GALACHIPA.'/api/auth/officer/login', [
            'username' => 'admin',
            'password' => 'password',
        ])->assertStatus(422);
    }

    public function test_upazila_officer_cannot_log_in_on_central_host(): void
    {
        // A upazila-level officer belongs to their subdomain, not the central admin site.
        $this->postJson(self::CENTRAL.'/api/auth/officer/login', [
            'username' => 'uno_galachipa',
            'password' => 'password',
        ])->assertStatus(422);
    }

    public function test_dc_logs_in_on_its_own_district_host(): void
    {
        // The DC's home is the district dashboard host, not the central console.
        // Every other DC test uses Sanctum::actingAs(), which never exercises this endpoint.
        $this->postJson(self::PATUAKHALI.'/api/auth/officer/login', [
            'username' => 'dc_patuakhali',
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('user.role', 'dc')
            ->assertJsonStructure(['token', 'user' => ['id', 'role_label_bn']]);
    }

    public function test_dc_cannot_log_in_on_another_districts_host(): void
    {
        // Khulna's DC has no business on the Patuakhali dashboard.
        $this->postJson(self::PATUAKHALI.'/api/auth/officer/login', [
            'username' => 'dc_khulna',
            'password' => 'password',
        ])->assertStatus(422);
    }

    public function test_dc_cannot_log_in_centrally_or_on_a_upazila_subdomain(): void
    {
        foreach ([self::CENTRAL, self::GALACHIPA] as $host) {
            $this->postJson($host.'/api/auth/officer/login', [
                'username' => 'dc_patuakhali',
                'password' => 'password',
            ])->assertStatus(422);
        }
    }


    public function test_host_context_reports_central(): void
    {
        $this->getJson(self::CENTRAL.'/api/registry/host-context')
            ->assertOk()->assertJsonPath('kind', 'central');
    }

    public function test_host_context_reports_upazila(): void
    {
        $this->getJson(self::GALACHIPA.'/api/registry/host-context')
            ->assertOk()
            ->assertJsonPath('kind', 'upazila')
            ->assertJsonPath('slug', 'galachipa')
            ->assertJsonPath('name_bn', 'গলাচিপা');
    }

    public function test_host_context_unknown_subdomain_returns_404(): void
    {
        $this->getJson('http://nowhere.lvh.me/api/registry/host-context')
            ->assertNotFound();
    }

    public function test_wrong_password_is_rejected(): void
    {
        $this->postJson(self::GALACHIPA.'/api/auth/officer/login', [
            'username' => 'uno_galachipa',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_citizen_otp_flow_creates_account_and_returns_token(): void
    {
        $req = $this->postJson(self::GALACHIPA.'/api/auth/citizen/request-otp', [
            'phone' => '01811111111',
        ])->assertOk();

        $code = $req->json('dev_code');
        $this->assertNotNull($code);

        $this->postJson(self::GALACHIPA.'/api/auth/citizen/verify-otp', [
            'phone' => '01811111111',
            'code' => $code,
            'name' => 'করিম',
        ])->assertOk()->assertJsonPath('user.role', 'citizen');

        $this->assertDatabaseHas('users', [
            'phone' => '01811111111',
            'role' => 'citizen',
            'tenant_id' => 'galachipa',
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
        $dc = User::where('username', 'dc_patuakhali')->first();
        Sanctum::actingAs($dc);

        // A write route must be blocked for the read-only DC regardless of the UI.
        $this->putJson(self::CENTRAL.'/api/profile', ['name' => 'X'])
            ->assertStatus(403);
    }

    public function test_officer_management_is_limited_to_seal_and_uno(): void
    {
        // A field officer (FWA) cannot manage accounts.
        Sanctum::actingAs(User::where('username', 'fwa_galachipa')->first());
        $this->getJson(self::GALACHIPA.'/api/officers')->assertStatus(403);

        // SEAL can create any role, including a UNO — for an upazila that has no serving one.
        // (Galachipa's seat is filled, which OfficerManagementTest covers.)
        Sanctum::actingAs(User::where('username', 'admin')->first());
        $this->postJson(self::GALACHIPA.'/api/officers', [
            'name' => 'নতুন কর্মকর্তা',
            'username' => 'new_uno',
            'password' => 'secret123',
            'role' => Role::UNO->value,
            'designation' => 'উপজেলা নির্বাহী কর্মকর্তা',
            'phone' => '01744444444',
            'email' => 'new.uno@example.com',
            'tenant_id' => 'dumuria',
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
        // Galachipa is in Patuakhali and Dumuria in Khulna, so a DC sees only its own district's
        // upazila — never the whole platform the way SEAL does.
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->first());
        $this->getJson(self::CENTRAL.'/api/registry/switchable-upazilas')
            ->assertOk()
            ->assertJsonCount(1, 'upazilas')
            ->assertJsonPath('upazilas.0.id', 'galachipa');
    }

    /**
     * Caddy's on-demand TLS gate (infra/Caddyfile). Caddy issues a certificate only when this
     * answers 2xx, so a leak here means any hostname pointed at the server can burn the ACME
     * rate limits. Called over the internal network with the hostname in ?domain=, hence the
     * odd-looking central-host request URL.
     */
    public function test_tls_gate_allows_only_the_central_host_and_real_upazilas(): void
    {
        $base = config('tenancy.base_domain');

        foreach ([$base, 'www.'.$base, 'galachipa.'.$base, 'dumuria.'.$base] as $allowed) {
            $this->getJson(self::CENTRAL.'/api/tls/allowed?domain='.$allowed)
                ->assertNoContent();
        }

        foreach ([
            'nowhere.'.$base,          // not a provisioned upazila
            'evil.example.com',        // someone else's domain
            'a.b.'.$base,              // more than one label deep
            'galachipa.'.$base.'.evil.com', // suffix-confusion attempt
            '',                        // missing param
        ] as $denied) {
            $this->getJson(self::CENTRAL.'/api/tls/allowed?domain='.$denied)
                ->assertNotFound();
        }
    }
}
