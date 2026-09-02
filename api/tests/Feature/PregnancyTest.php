<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * প্রসূতি কল্যাণ API — tenant-scoped list/tabs, create, delivery confirmation, and role gating.
 */
class PregnancyTest extends TestCase
{
    use RefreshDatabase;

    private const GOLACHIPA = 'http://galachipa.lvh.me';
    private const DUMURIA = 'http://dumuria.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function fwa(): User
    {
        return User::where('username', 'fwa_galachipa')->firstOrFail();
    }

    public function test_list_returns_seeded_records_with_tab_counts(): void
    {
        Sanctum::actingAs($this->fwa());

        $res = $this->getJson(self::GOLACHIPA.'/api/pregnancies')->assertOk();

        // 18 seeded in Galachipa (12 not delivered, 6 delivered).
        $tabs = collect($res->json('tabs'))->keyBy('key');
        $this->assertSame(18, $tabs['all']['total']);
        $this->assertSame(12, $tabs['not_delivered']['total']);
        $this->assertSame(6, $tabs['delivered']['total']);
    }

    public function test_status_tab_filters_the_list(): void
    {
        Sanctum::actingAs($this->fwa());
        $res = $this->getJson(self::GOLACHIPA.'/api/pregnancies?status=delivered')->assertOk();

        $this->assertSame(6, $res->json('meta.total'));
        foreach ($res->json('data') as $row) {
            $this->assertSame('delivered', $row['delivery_status']);
        }
    }

    public function test_list_is_tenant_scoped(): void
    {
        // Dumuria has no seeded pregnancies. A SEAL admin switched to Dumuria sees none.
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());
        $this->getJson(self::DUMURIA.'/api/pregnancies')
            ->assertOk()->assertJsonPath('meta.total', 0);
    }

    public function test_fwa_can_create_a_pregnancy(): void
    {
        Sanctum::actingAs($this->fwa());

        $this->postJson(self::GOLACHIPA.'/api/pregnancies', [
            'mother_name_bn' => 'নতুন প্রসূতি',
            'husband_name' => 'স্বামী',
            'ward_no' => 3,
            'blood_group' => 'B+',
            'chronic_diseases' => ['ডায়াবেটিস'],
            'mobile' => '01712345678',
        ])->assertCreated()->assertJsonPath('data.mother_name_bn', 'নতুন প্রসূতি');

        $this->assertDatabaseHas('pregnancies', [
            'mother_name_bn' => 'নতুন প্রসূতি',
            'tenant_id' => 'galachipa',
            'created_by' => $this->fwa()->id,
        ]);
    }

    public function test_create_requires_mother_name(): void
    {
        Sanctum::actingAs($this->fwa());
        $this->postJson(self::GOLACHIPA.'/api/pregnancies', ['husband_name' => 'x'])
            ->assertStatus(422);
    }

    public function test_fwa_confirms_delivery(): void
    {
        Sanctum::actingAs($this->fwa());

        $id = $this->getJson(self::GOLACHIPA.'/api/pregnancies?status=not_delivered')
            ->json('data.0.id');

        $this->patchJson(self::GOLACHIPA."/api/pregnancies/{$id}/delivery-status", [
            'delivery_status' => 'delivered',
            'actual_delivery_date' => '2026-08-01',
            'mother_alive' => true,
            'delivery_type' => 'normal',
            'baby_sex' => 'female',
            'birth_weight_kg' => 3.1,
            'birth_time' => '09:30',
        ])->assertOk()->assertJsonPath('data.delivery_status', 'delivered');

        $this->assertDatabaseHas('pregnancies', ['id' => $id, 'delivery_status' => 'delivered', 'baby_sex' => 'female']);
    }

    public function test_read_only_dc_cannot_create(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        // DC switches into Galachipa via header, but writes are blocked server-side.
        $this->postJson('http://lvh.me/api/pregnancies', [
            'mother_name_bn' => 'x',
        ], ['X-Upazila' => 'galachipa'])->assertStatus(403);
    }

    public function test_citizen_cannot_access_pregnancies(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->getJson(self::GOLACHIPA.'/api/pregnancies')->assertStatus(403);
    }
}
