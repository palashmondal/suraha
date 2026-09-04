<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DeliveryStatus;
use App\Models\BirthRegistration;
use App\Models\Pregnancy;
use App\Models\Union;
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

    /**
     * A সচিব only sees their own union (RoleVisibilityScope), so test fixtures have to be filed
     * there — as the seeder and the real FWA→সচিব flow do.
     */
    private function pregnancyInSochibUnion(bool $delivered = true, array $attrs = []): int
    {
        $unionId = $this->sochib()->union_id;

        return Upazila::find('galachipa')->run(function () use ($delivered, $attrs, $unionId) {
            $factory = Pregnancy::factory();

            return ($delivered ? $factory->delivered() : $factory)
                ->create($attrs + ['union_id' => $unionId])->id;
        });
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

    /** Search is per-word AND over the columns the তালিকা shows, with Bengali digits folded. */
    public function test_search_matches_across_the_listed_columns(): void
    {
        $unionId = $this->sochib()->union_id;
        $union = Union::find($unionId);
        Upazila::find('galachipa')->run(fn () => BirthRegistration::create([
            'child_name' => 'রাইসা আক্তার',
            'mother_name' => 'মোছাঃ সালমা',
            'union_id' => $unionId,
            'ward_no' => 7,
        ]));

        Sanctum::actingAs($this->sochib());
        $names = fn (string $q) => array_column(
            $this->getJson(self::GALACHIPA.'/api/birth-registrations?q='.urlencode($q))->assertOk()->json('data'),
            'child_name',
        );

        // Both terms must match the same row — the union name plus the child's.
        $this->assertContains('রাইসা আক্তার', $names($union->name_bn.' রাইসা'));
        // Ward typed as it is displayed, in Bengali digits.
        $this->assertContains('রাইসা আক্তার', $names('রাইসা ৭'));
        // A term matching nothing on the row excludes it.
        $this->assertNotContains('রাইসা আক্তার', $names('রাইসা কুমিল্লা'));
    }

    public function test_sochib_approves_delivered_pregnancy_and_gets_bdris_number(): void
    {
        // Create a fresh delivered pregnancy to approve.
        $id = $this->pregnancyInSochibUnion(attrs: ['mother_name_bn' => 'পরীক্ষা মা']);

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
        $id = $this->pregnancyInSochibUnion();

        Sanctum::actingAs($this->sochib());
        $first = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.registration_no');
        $second = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.registration_no');

        $this->assertSame($first, $second);
        $this->assertSame(1, BirthRegistration::withoutTenancy()->where('pregnancy_id', $id)->count());
    }

    public function test_cannot_approve_a_not_delivered_pregnancy(): void
    {
        $id = $this->pregnancyInSochibUnion(delivered: false);

        Sanctum::actingAs($this->sochib());
        $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->assertStatus(422);
    }

    public function test_certificate_is_downloadable(): void
    {
        $id = $this->pregnancyInSochibUnion();

        Sanctum::actingAs($this->sochib());
        $regId = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.id');

        $this->get(self::GALACHIPA."/api/birth-registrations/{$regId}/certificate")
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_draft_prefills_the_certificate_from_the_mother(): void
    {
        $id = $this->pregnancyInSochibUnion(attrs: [
            'mother_name_bn' => 'রোকেয়া বেগম',
            'mother_name_en' => 'Rokeya Begum',
            'husband_name' => 'করিম মিয়া',
            'mother_nid' => '1234567890',
            'father_nid' => '1990123456789',
        ]);

        Sanctum::actingAs($this->sochib());
        $draft = $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}/birth-registration-draft")
            ->assertOk()
            ->assertJsonPath('already_registered', false)
            ->json('data');

        $this->assertSame('রোকেয়া বেগম', $draft['mother_name']);
        $this->assertSame('Rokeya Begum', $draft['mother_name_en']);
        $this->assertSame('করিম মিয়া', $draft['father_name']);      // husband = the child's father
        $this->assertSame('1234567890', $draft['mother_nid']);
        $this->assertSame('1990123456789', $draft['father_nid']);
        $this->assertSame('বাংলাদেশী', $draft['mother_nationality']);
        $this->assertNull($draft['child_name']);                      // never captured → blank
        $this->assertNotEmpty($draft['place_of_birth']);
        $this->assertStringContainsString('গলাচিপা', $draft['place_of_birth']);
    }

    public function test_sochib_edits_are_saved_and_printed_on_the_certificate(): void
    {
        $id = $this->pregnancyInSochibUnion(attrs: ['mother_name_bn' => 'ভুল বানান']);

        Sanctum::actingAs($this->sochib());
        $reg = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve", [
            'child_name' => 'মোছাঃ জান্নাত আক্তার',
            'child_name_en' => 'Mst Jannat Akter',
            'mother_name' => 'মোছাঃ রিনা আক্তার',   // corrected by the সচিব
            'mother_name_en' => 'Mst Rina Akter',
            'father_name' => 'মোঃ বাচ্চু মিয়া',
            'place_of_birth' => 'কিশোরগঞ্জ, বাংলাদেশ',
            'permanent_address' => 'ঢালারপাড়, করিমগঞ্জ',
        ])->assertCreated()->json('data');

        $this->assertSame('মোছাঃ জান্নাত আক্তার', $reg['child_name']);
        $this->assertSame('Mst Rina Akter', $reg['mother_name_en']);
        $this->assertDatabaseHas('birth_registrations', [
            'id' => $reg['id'],
            'mother_name' => 'মোছাঃ রিনা আক্তার',
            'place_of_birth' => 'কিশোরগঞ্জ, বাংলাদেশ',
        ]);

        $certificate = $this->get(self::GALACHIPA."/api/birth-registrations/{$reg['id']}/certificate")
            ->assertOk()->streamedContent();

        foreach (['মোছাঃ জান্নাত আক্তার', 'Mst Jannat Akter', 'কিশোরগঞ্জ, বাংলাদেশ', 'ঢালারপাড়, করিমগঞ্জ'] as $printed) {
            $this->assertStringContainsString($printed, $certificate);
        }

        // Approval is idempotent: reopening the form shows what was filed, not a fresh draft.
        $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}/birth-registration-draft")
            ->assertOk()
            ->assertJsonPath('already_registered', true)
            ->assertJsonPath('data.child_name', 'মোছাঃ জান্নাত আক্তার');
    }

    public function test_certificate_form_rejects_a_malformed_nid(): void
    {
        $id = $this->pregnancyInSochibUnion();

        Sanctum::actingAs($this->sochib());
        $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve", ['mother_nid' => '123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['mother_nid']);
    }

    public function test_registration_number_is_visible_on_the_mother_record(): void
    {
        $fwa = User::where('username', 'fwa_galachipa')->firstOrFail();
        $id = $this->pregnancyInSochibUnion(attrs: ['created_by' => $fwa->id]);

        Sanctum::actingAs($this->sochib());
        $regNo = $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->json('data.registration_no');
        $this->assertNotEmpty($regNo);

        // The FWA who entered her, and the UNO overseeing the upazila, both read the number off
        // the প্রসূতি record — neither has access to the birth-registration module.
        foreach ([$fwa, User::where('username', 'uno_galachipa')->firstOrFail()] as $reader) {
            Sanctum::actingAs($reader);
            $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}")
                ->assertOk()
                ->assertJsonPath('data.birth_registration_no', $regNo);
        }
    }

    public function test_sochib_sees_only_their_own_union(): void
    {
        $otherUnion = Upazila::find('galachipa')->run(fn () =>
            Union::where('id', '!=', $this->sochib()->union_id)->value('id'));

        $id = Upazila::find('galachipa')->run(fn () =>
            Pregnancy::factory()->delivered()->create(['union_id' => $otherUnion])->id);

        Sanctum::actingAs($this->sochib());

        // Not in their union → not listed, and not reachable by id either.
        $this->postJson(self::GALACHIPA."/api/pregnancies/{$id}/approve")->assertNotFound();
        $this->getJson(self::GALACHIPA.'/api/pregnancies')
            ->assertOk()
            ->assertJsonMissing(['id' => $id]);
    }

    public function test_fwa_cannot_manage_birth_registrations(): void
    {
        Sanctum::actingAs(User::where('username', 'fwa_galachipa')->firstOrFail());
        $this->getJson(self::GALACHIPA.'/api/birth-registrations')->assertStatus(403);
    }
}
