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

        $galachipaComplaints = \App\Models\Upazila::find('galachipa')
            ->run(fn () => \App\Models\Complaint::count());
        $galachipaAppointments = \App\Models\Upazila::find('galachipa')
            ->run(fn () => \App\Models\Appointment::count());

        $res->assertJsonPath('scope.level', 'tenant')
            ->assertJsonPath('scope.label', 'গলাচিপা');
        // 18 pregnancies seeded in Galachipa.
        $this->assertSame(18, $res->json('pregnancy.total'));
        $this->assertSame(6, $res->json('pregnancy.delivered'));
        $this->assertSame($galachipaComplaints, $res->json('complaints.total'));
        // Counted from the seeded rows: the সূচি seed grows this number and a hard-coded
        // total goes stale with it.
        $this->assertSame($galachipaAppointments, $res->json('appointments.total'));
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

    /**
     * The DC dashboard on its district host: the district aggregate by default, and one upazila
     * when the DC picks it from the switcher. Both views come from the same endpoint — the
     * X-Upazila header is the only difference.
     */
    public function test_dc_district_host_aggregates_then_narrows_to_one_upazila(): void
    {
        $host = 'http://patuakhali.lvh.me';
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());

        $this->getJson($host.'/api/dashboard/stats')
            ->assertOk()
            ->assertJsonPath('scope.level', 'district');

        $this->getJson($host.'/api/dashboard/stats', ['X-Upazila' => 'galachipa'])
            ->assertOk()
            ->assertJsonPath('scope.level', 'tenant')
            ->assertJsonPath('scope.label', 'গলাচিপা');

        // The switcher is bounded by district: Dumuria is Khulna's, not Patuakhali's.
        $this->getJson($host.'/api/dashboard/stats', ['X-Upazila' => 'dumuria'])
            ->assertStatus(403);
    }

    /** A DC may look, never touch — enforced server-side regardless of host. */
    public function test_dc_cannot_write_from_its_district_host(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());

        $this->postJson('http://patuakhali.lvh.me/api/complaints', [
            'title' => 'x', 'description' => 'y',
        ], ['X-Upazila' => 'galachipa'])->assertStatus(403);
    }
}
