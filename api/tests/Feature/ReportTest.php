<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Reporting & analytics (§8.7): scope-aware KPIs + comparison; filters; role gating.
 */
class ReportTest extends TestCase
{
    use RefreshDatabase;

    private const GOLACHIPA = 'http://galachipa.lvh.me';
    private const ADMIN = 'http://lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_officer_gets_own_upazila_report_with_union_comparison(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $res = $this->getJson(self::GOLACHIPA.'/api/reports')->assertOk();

        $res->assertJsonPath('scope.level', 'tenant');
        $this->assertSame(18, $res->json('kpis.pregnancies_total'));
        $this->assertSame(10, $res->json('kpis.complaints_total'));
        $this->assertSame(11, $res->json('kpis.appointments_total'));

        // Single scope → union comparison, no upazila comparison.
        $this->assertIsArray($res->json('by_union'));
        $this->assertNull($res->json('by_upazila'));

        // Chart bundles present.
        $this->assertCount(6, $res->json('trends'));
        $this->assertCount(4, $res->json('status.complaint'));
        $this->assertCount(3, $res->json('funnel'));
    }

    public function test_delivery_and_resolution_rates_are_percentages(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $k = $this->getJson(self::GOLACHIPA.'/api/reports')->json('kpis');

        // 6 of 18 delivered ≈ 33.3%.
        $this->assertEqualsWithDelta(33.3, $k['delivery_rate'], 0.2);
        $this->assertGreaterThanOrEqual(0, $k['resolution_rate']);
        $this->assertLessThanOrEqual(100, $k['approval_rate']);
    }

    public function test_date_filter_narrows_counts(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        // A window far in the past excludes today's seeded rows.
        $res = $this->getJson(self::GOLACHIPA.'/api/reports?from=2020-01-01&to=2020-12-31')->assertOk();
        $this->assertSame(0, $res->json('kpis.pregnancies_total'));
    }

    public function test_seal_aggregate_returns_upazila_comparison(): void
    {
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        $res = $this->getJson(self::ADMIN.'/api/reports')->assertOk();

        $res->assertJsonPath('scope.level', 'global');
        $this->assertNull($res->json('by_union'));
        $this->assertCount(2, $res->json('by_upazila')); // galachipa + dumuria
    }

    public function test_citizen_cannot_access_reports(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->getJson(self::GOLACHIPA.'/api/reports')->assertStatus(403);
    }
}
