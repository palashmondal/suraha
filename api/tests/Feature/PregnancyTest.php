<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Pregnancy;
use App\Models\Upazila;
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

    private const GALACHIPA = 'http://galachipa.lvh.me';
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

        $res = $this->getJson(self::GALACHIPA.'/api/pregnancies')->assertOk();

        // 18 seeded in Galachipa (12 not delivered, 6 delivered).
        $tabs = collect($res->json('tabs'))->keyBy('key');
        $this->assertSame(18, $tabs['all']['total']);
        $this->assertSame(12, $tabs['not_delivered']['total']);
        $this->assertSame(6, $tabs['delivered']['total']);
    }

    public function test_status_tab_filters_the_list(): void
    {
        Sanctum::actingAs($this->fwa());
        $res = $this->getJson(self::GALACHIPA.'/api/pregnancies?status=delivered')->assertOk();

        $this->assertSame(6, $res->json('meta.total'));
        foreach ($res->json('data') as $row) {
            $this->assertSame('delivered', $row['delivery_status']);
        }
    }

    /** The edit form PUTs the whole form back, sending null for boxes the FWA cleared. */
    public function test_update_edits_fields_and_clears_blanked_ones(): void
    {
        Sanctum::actingAs($this->fwa());
        $id = Pregnancy::query()->value('id');

        $this->putJson(self::GALACHIPA."/api/pregnancies/{$id}", [
            'mother_name_bn' => 'সংশোধিত নাম',
            'mobile' => null,
        ])->assertOk()->assertJsonPath('data.mother_name_bn', 'সংশোধিত নাম');

        $this->assertNull(Pregnancy::find($id)->mobile);
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

        $this->postJson(self::GALACHIPA.'/api/pregnancies', [
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

    public function test_parent_identity_is_stored_and_returned(): void
    {
        Sanctum::actingAs($this->fwa());

        $res = $this->postJson(self::GALACHIPA.'/api/pregnancies', [
            'mother_name_bn' => 'পরিচয়পত্রসহ প্রসূতি',
            'mother_nid' => '1234567890',
            'mother_birth_reg_no' => '20050695116392924',
            'father_nid' => '1990123456789',
            'father_birth_reg_no' => '19900695116392924',
        ])->assertCreated();

        $res->assertJsonPath('data.mother_nid', '1234567890')
            ->assertJsonPath('data.father_birth_reg_no', '19900695116392924');

        $this->assertDatabaseHas('pregnancies', [
            'mother_birth_reg_no' => '20050695116392924',
            'father_nid' => '1990123456789',
        ]);
    }

    public function test_malformed_nid_and_birth_reg_no_are_rejected(): void
    {
        Sanctum::actingAs($this->fwa());

        $this->postJson(self::GALACHIPA.'/api/pregnancies', [
            'mother_name_bn' => 'ভুল পরিচয়',
            'mother_nid' => '12345',                  // not 10/13/17 digits
            'father_birth_reg_no' => '2005069511639', // not 17 digits
        ])->assertStatus(422)->assertJsonValidationErrors(['mother_nid', 'father_birth_reg_no']);
    }

    public function test_create_requires_mother_name(): void
    {
        Sanctum::actingAs($this->fwa());
        $this->postJson(self::GALACHIPA.'/api/pregnancies', ['husband_name' => 'x'])
            ->assertStatus(422);
    }

    public function test_fwa_confirms_delivery(): void
    {
        Sanctum::actingAs($this->fwa());

        $id = $this->getJson(self::GALACHIPA.'/api/pregnancies?status=not_delivered')
            ->json('data.0.id');

        $this->patchJson(self::GALACHIPA."/api/pregnancies/{$id}/delivery-status", [
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

    public function test_fwa_sees_only_their_own_entries(): void
    {
        // A second FWA's record in the same upazila must not appear in the first FWA's register.
        $otherFwa = User::factory()->create([
            'role' => \App\Enums\Role::FWA->value,
            'tenant_id' => 'galachipa',
            'union_id' => $this->fwa()->union_id,
        ]);

        $id = Upazila::find('galachipa')->run(fn () => Pregnancy::factory()
            ->create(['mother_name_bn' => 'অন্য এফডব্লিউএ-র এন্ট্রি', 'created_by' => $otherFwa->id])->id);

        Sanctum::actingAs($this->fwa());

        $this->getJson(self::GALACHIPA.'/api/pregnancies')
            ->assertOk()
            ->assertJsonMissing(['id' => $id]);
        $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}")->assertNotFound();

        // The UNO, who oversees the whole upazila, still sees it.
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}")->assertOk();
    }

    public function test_seal_lists_every_upazila_when_none_is_selected(): void
    {
        // Only Galachipa is seeded with mothers, so give Dumuria one to prove the list crosses.
        Upazila::find('dumuria')->run(fn () => Pregnancy::factory()->create(['mother_name_bn' => 'ডুমুরিয়ার মা']));

        // The console's "সকল উপজেলা" view: no subdomain, no X-Upazila. This used to 400, which the
        // web rendered as "কোনো তথ্য নাই" on a page that should have aggregated.
        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());

        $res = $this->getJson('http://suraha.net/api/pregnancies')->assertOk();

        $this->assertSame(19, $res->json('tabs.0.total')); // 18 Galachipa + the Dumuria one

        // Every row says which upazila it belongs to, and the other upazila's mother is reachable
        // (the seeded rows share a timestamp, so the first page's order is not deterministic).
        $this->assertNotEmpty(collect($res->json('data'))->pluck('upazila')->filter());
        $this->getJson('http://suraha.net/api/pregnancies?q='.urlencode('ডুমুরিয়ার মা'))
            ->assertOk()
            ->assertJsonPath('data.0.upazila', 'ডুমুরিয়া');
    }

    public function test_dc_aggregate_stops_at_their_own_district(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());

        $res = $this->getJson('http://patuakhali.suraha.net/api/pregnancies')->assertOk();

        // Patuakhali holds Galachipa; Dumuria is in Khulna and must not appear.
        $this->assertSame(['গলাচিপা'], collect($res->json('data'))->pluck('upazila')->unique()->values()->all());
    }

    public function test_officer_cannot_read_another_upazila_record_from_the_central_host(): void
    {
        $dumuria = Upazila::find('dumuria')->run(fn () => Pregnancy::factory()->create()->id);

        // With no tenant resolved the tenant scope stands down; VisibleTenantScope has to hold the
        // line, or the central host becomes a way around tenancy.
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson("http://suraha.net/api/pregnancies/{$dumuria}")->assertNotFound();
    }

    public function test_search_covers_every_column_the_listing_shows(): void
    {
        $union = Upazila::find('galachipa')->run(fn () => \App\Models\Union::where('name', 'Galachipa')->firstOrFail());

        $id = Upazila::find('galachipa')->run(fn () => Pregnancy::factory()->create([
            'mother_name_bn' => 'সালমা খাতুন',
            'husband_name' => 'জলিল সরদার',
            'mobile' => '01799887766',
            'ward_no' => 7,
            'union_id' => $union->id,
            'created_by' => $this->fwa()->id,
        ])->id);

        Sanctum::actingAs($this->fwa());

        // A term the user can read in the table has to find the row it is printed in — including
        // the district and upazila columns, which live on other tables, and the Bengali ward digit.
        foreach (['সালমা', 'জলিল', '01799', $union->name_bn, 'গলাচিপা', 'পটুয়াখালী', '৭'] as $term) {
            $ids = collect($this->getJson(self::GALACHIPA.'/api/pregnancies?q='.urlencode($term))
                ->assertOk()->json('data'))->pluck('id');

            $this->assertContains($id, $ids, "searching \"{$term}\" did not find her");
        }

        // And a term that matches nothing still returns a well-formed empty list.
        $this->getJson(self::GALACHIPA.'/api/pregnancies?q='.urlencode('অস্তিত্বহীন'))
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('tabs.0.total', 0);

        // The address is NOT searched: it is not a column of this table, and matching it would
        // return a row with the typed term nowhere on screen.
        Pregnancy::withoutTenancy()->where('id', $id)->update(['address' => 'গোপন পাড়া']);
        $this->getJson(self::GALACHIPA.'/api/pregnancies?q='.urlencode('গোপন পাড়া'))
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_each_word_is_its_own_search_term(): void
    {
        Upazila::find('dumuria')->run(fn () => Pregnancy::factory()->create(['mother_name_bn' => 'আয়েশা বেগম']));
        Upazila::find('dumuria')->run(fn () => Pregnancy::factory()->create(['mother_name_bn' => 'রহিমা বেগম']));
        Upazila::find('galachipa')->run(fn () => Pregnancy::factory()->create(['mother_name_bn' => 'আয়েশা খাতুন']));

        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());

        // "upazila name" + "mother's name": no single column holds both words, so matched as one
        // string this returned nothing. Each word has to match somewhere, and all of them must.
        $res = $this->getJson('http://suraha.net/api/pregnancies?q='.urlencode('ডুমুরিয়া আয়েশা'))
            ->assertOk();

        $names = collect($res->json('data'))->pluck('mother_name_bn');
        $this->assertContains('আয়েশা বেগম', $names);          // in ডুমুরিয়া, named আয়েশা
        $this->assertNotContains('রহিমা বেগম', $names);        // right upazila, wrong name
        $this->assertNotContains('আয়েশা খাতুন', $names);       // right name, wrong upazila
    }

    public function test_search_finds_bangla_typed_in_either_unicode_form(): void
    {
        // য় is either U+09DF or য + ় (U+09AF U+09BC); both render identically and a Bangla
        // keyboard usually sends the first while the register holds the second. Searching the
        // upazila's own name used to find nothing at all because of it.
        $precomposed = hex2bin('e0a6a1e0a781e0a6aee0a781e0a6b0e0a6bfe0a79fe0a6be');   // ডুমুরিয়া
        $decomposed = 'ডুমুরিয়া';
        $this->assertNotSame($precomposed, $decomposed, 'the two spellings must differ in bytes');

        Upazila::find('dumuria')->run(fn () => Pregnancy::factory()->create(['mother_name_bn' => 'ডুমুরিয়ার মা']));

        Sanctum::actingAs(User::where('username', 'admin')->firstOrFail());

        foreach ([$precomposed, $decomposed] as $typed) {
            $this->getJson('http://suraha.net/api/pregnancies?q='.urlencode($typed))
                ->assertOk()
                ->assertJsonPath('data.0.upazila', 'ডুমুরিয়া');
        }
    }

    public function test_child_name_is_optional_at_delivery_and_prefills_the_certificate(): void
    {
        // Filed in the FWA's own union, which is also the সচিব's — both have to reach it.
        $id = Upazila::find('galachipa')->run(fn () => Pregnancy::factory()
            ->create(['created_by' => $this->fwa()->id, 'union_id' => $this->fwa()->union_id])->id);

        Sanctum::actingAs($this->fwa());

        // Confirming a delivery without a name is fine — one is often not chosen that day.
        $this->patchJson(self::GALACHIPA."/api/pregnancies/{$id}/delivery-status", [
            'delivery_status' => 'delivered',
        ])->assertOk()->assertJsonPath('data.child_name', null);

        // Given one, it carries through to the সচিব's জন্ম নিবন্ধন form instead of being re-asked.
        $this->patchJson(self::GALACHIPA."/api/pregnancies/{$id}/delivery-status", [
            'delivery_status' => 'delivered',
            'child_name' => 'মোছাঃ জান্নাত আক্তার',
        ])->assertOk()->assertJsonPath('data.child_name', 'মোছাঃ জান্নাত আক্তার');

        Sanctum::actingAs(User::where('username', 'sochib_galachipa')->firstOrFail());
        $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}/birth-registration-draft")
            ->assertOk()
            ->assertJsonPath('data.child_name', 'মোছাঃ জান্নাত আক্তার');
    }

    /**
     * ডেলিভারি হয়েছে puts the newborn into the নবজাতক তালিকা straight away, জন্মনিবন্ধন সম্পন্ন হয়নি,
     * and reversing the status takes it back out again.
     */
    public function test_confirmed_delivery_lands_in_the_newborn_list(): void
    {
        Sanctum::actingAs($this->fwa());
        $id = Pregnancy::query()->where('delivery_status', 'not_delivered')->value('id');

        $this->patchJson(self::GALACHIPA."/api/pregnancies/{$id}/delivery-status", [
            'delivery_status' => 'delivered',
            'actual_delivery_date' => '2026-08-01',
            'baby_sex' => 'female',
            'child_name' => 'মোছাঃ রাইসা',
        ])->assertOk();

        $sochib = User::where('username', 'sochib_galachipa')->firstOrFail();
        Sanctum::actingAs($sochib);
        $res = $this->getJson(self::GALACHIPA.'/api/birth-registrations?status=pending_entry')->assertOk();
        $this->assertContains('মোছাঃ রাইসা', array_column($res->json('data'), 'child_name'));

        // The সচিব still gets an editable draft — a waiting row is not a filed certificate.
        $this->getJson(self::GALACHIPA."/api/pregnancies/{$id}/birth-registration-draft")
            ->assertOk()
            ->assertJsonPath('already_registered', false);

        // Reversed by mistake → out of the তালিকা again.
        Sanctum::actingAs($this->fwa());
        $this->patchJson(self::GALACHIPA."/api/pregnancies/{$id}/delivery-status", [
            'delivery_status' => 'not_delivered',
        ])->assertOk();
        $this->assertDatabaseMissing('birth_registrations', ['pregnancy_id' => $id]);
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
        $this->getJson(self::GALACHIPA.'/api/pregnancies')->assertStatus(403);
    }
}
