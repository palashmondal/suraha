<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Dashboard stats — per-tenant on a subdomain; SEAL/DC aggregate on the console host.
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_officer_gets_own_upazila_stats(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $res = $this->getJson('http://galachipa.lvh.me/api/dashboard/stats')->assertOk();

        $res->assertJsonPath('scope.level', 'tenant')
            ->assertJsonPath('scope.label', 'গলাচিপা');
        // 18 pregnancies seeded in Galachipa.
        $this->assertSame(18, $res->json('pregnancy.total'));
        $this->assertSame(6, $res->json('pregnancy.delivered'));
        $this->assertSame(10, $res->json('complaints.total'));
        $this->assertSame(11, $res->json('appointments.total'));
    }

    public function test_seal_aggregate_spans_all_upazilas(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        $res = $this->getJson('http://lvh.me/api/dashboard/stats')->assertOk();

        $res->assertJsonPath('scope.level', 'global')
            ->assertJsonPath('scope.upazila_count', 2); // galachipa + dumuria
        // Dumuria has no module data, so totals equal Galachipa's.
        $this->assertSame(18, $res->json('pregnancy.total'));
    }

    public function test_seal_switched_to_one_upazila_scopes_to_it(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        // Switch to Dumuria (empty) via header.
        $res = $this->getJson('http://lvh.me/api/dashboard/stats', ['X-Upazila' => 'dumuria'])->assertOk();

        $res->assertJsonPath('scope.level', 'tenant')->assertJsonPath('scope.label', 'ডুমুরিয়া');
        $this->assertSame(0, $res->json('pregnancy.total'));
    }

    public function test_dc_aggregate_is_district_scoped(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        $res = $this->getJson('http://lvh.me/api/dashboard/stats')->assertOk();

        // Patuakhali holds only Galachipa, so the DC aggregate covers that one upazila's data —
        // Dumuria (Khulna) must not leak in.
        $res->assertJsonPath('scope.level', 'district')->assertJsonPath('scope.upazila_count', 1);
        $this->assertSame(18, $res->json('pregnancy.total'));
    }
}
