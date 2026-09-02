<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DeliveryStatus;
use App\Models\BirthRegistration;
use App\Models\Pregnancy;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * জন্ম নিবন্ধন + BDRIS — Sochib approval of a delivered pregnancy submits to BDRIS and yields a
 * certificate; list tabs, tenant scoping, and role gating.
 */
class BirthRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const GALACHIPA = 'http://galachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function sochib(): User
    {
        return User::where('username', 'sochib_galachipa')->firstOrFail();
    }

    private function deliveredPregnancyId(): int
    {
        return Upazila::find('galachipa')->run(fn () =>
            Pregnancy::where('delivery_status', DeliveryStatus::DELIVERED->value)
                ->whereDoesntHave('birthRegistration')->value('id')
                ?? Pregnancy::where('delivery_status', DeliveryStatus::DELIVERED->value)->value('id'));
    }

    public function test_list_has_entered_and_pending_tabs(): void
    {
        Sanctum::actingAs($this->sochib());
        $res = $this->getJson(self::GALACHIPA.'/api/birth-registrations')->assertOk();

        $tabs = collect($res->json('tabs'))->keyBy('key');
        // Seeder: 3 entered (from approvals) + 2 pending manual entries.
        $this->assertSame(3, $tabs['entered']['total']);
        $this->assertSame(2, $tabs['pending_entry']['total']);
        $this->assertSame(5, $tabs['all']['total']);
    }

    public function test_sochib_approves_delivered_pregnancy_and_gets_bdris_number(): void
    {
        // Create a fresh delivered pregnancy to approve.
        $id = Upazila::find('galachipa')->run(function () {
            return Pregnancy::factory()->delivered()->create(['mother_name_bn' => 'পরীক্ষা মা'])->id;
        });

        Sanctum::actingAs($this->sochib());
        $res = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve", ['child_name' => 'শিশু'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'entered')
            ->assertJsonPath('data.has_certificate', true);

        $this->assertNotEmpty($res->json('data.registration_no'));
        $this->assertDatabaseHas('birth_registrations', ['pregnancy_id' => $id, 'status' => 'entered']);
    }

    public function test_approval_is_idempotent_per_pregnancy(): void
    {
        $id = Upazila::find('galachipa')->run(fn () =>
            Pregnancy::factory()->delivered()->create()->id);

        Sanctum::actingAs($this->sochib());
        $first = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.registration_no');
        $second = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.registration_no');

        $this->assertSame($first, $second);
        $this->assertSame(1, BirthRegistration::withoutTenancy()->where('pregnancy_id', $id)->count());
    }

    public function test_cannot_approve_a_not_delivered_pregnancy(): void
    {
        $id = Upazila::find('galachipa')->run(fn () =>
            Pregnancy::factory()->create()->id); // not delivered

        Sanctum::actingAs($this->sochib());
        $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->assertStatus(422);
    }

    public function test_certificate_is_downloadable(): void
    {
        $id = Upazila::find('galachipa')->run(fn () =>
            Pregnancy::factory()->delivered()->create()->id);

        Sanctum::actingAs($this->sochib());
        $regId = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.id');

        $this->get(self::GALACHIPA."/api/birth-registrations/{$regId}/certificate")
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_fwa_cannot_manage_birth_registrations(): void
    {
        Sanctum::actingAs(User::where('username', 'fwa_galachipa')->firstOrFail());
        $this->getJson(self::GALACHIPA.'/api/birth-registrations')->assertStatus(403);
    }
}
