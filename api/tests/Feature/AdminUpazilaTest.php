<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Admin instance management + in-app upazila switching (X-Upazila header) for cross-tenant roles.
 */
class AdminUpazilaTest extends TestCase
{
    use RefreshDatabase;

    // SEAL now works on the central host (the admin.* host is retired).
    private const ADMIN = 'http://lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function seal(): User
    {
        return User::where('username', 'admin')->firstOrFail();
    }

    // ---- Instance management ------------------------------------------

    public function test_admin_host_is_central_not_a_tenant(): void
    {
        // The central host (lvh.me) must resolve tenant-less (not read as a subdomain tenant).
        $this->getJson(self::ADMIN.'/api/registry/current-upazila')
            ->assertOk()
            ->assertJsonPath('upazila', null);
    }

    public function test_seal_lists_all_upazilas(): void
    {
        Sanctum::actingAs($this->seal());
        $this->getJson(self::ADMIN.'/api/upazilas')
            ->assertOk()
            ->assertJsonCount(2, 'data'); // galachipa + dumuria from the seeder
    }

    public function test_seal_can_create_a_new_upazila_instance(): void
    {
        Sanctum::actingAs($this->seal());

        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'kalapara',
            'name' => 'Kalapara',
            'name_bn' => 'কলাপাড়া',
            'district_id' => 1,
        ])->assertCreated()->assertJsonPath('data.id', 'kalapara');

        $this->assertDatabaseHas('tenants', ['id' => 'kalapara', 'name_bn' => 'কলাপাড়া']);
        $this->assertDatabaseHas('domains', ['domain' => 'kalapara', 'tenant_id' => 'kalapara']);

        // The new subdomain now resolves as a tenant.
        $this->getJson('http://kalapara.lvh.me/api/registry/current-upazila')
            ->assertOk()->assertJsonPath('upazila.id', 'kalapara');
    }

    public function test_creating_upazila_auto_provisions_a_uno(): void
    {
        Sanctum::actingAs($this->seal());

        // Kalapara is in Patuakhali, which already has dc_patuakhali → no second DC provisioned.
        $patuakhaliId = \App\Models\District::where('name', 'Patuakhali')->value('id');
        $res = $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'kalapara', 'name' => 'Kalapara', 'name_bn' => 'কলাপাড়া', 'district_id' => $patuakhaliId,
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['username' => 'uno_kalapara', 'role' => 'uno', 'tenant_id' => 'kalapara']);

        $creds = $res->json('credentials');
        $this->assertCount(1, $creds); // UNO only
        $this->assertSame('uno_kalapara', $creds[0]['username']);
        $this->assertNotEmpty($creds[0]['temp_password']);

        // The generated UNO can actually log in on its subdomain with the returned password.
        $this->postJson('http://kalapara.lvh.me/api/auth/officer/login', [
            'username' => 'uno_kalapara', 'password' => $creds[0]['temp_password'],
        ])->assertOk()->assertJsonPath('user.role', 'uno');
    }

    public function test_new_district_also_provisions_a_dc(): void
    {
        Sanctum::actingAs($this->seal());

        $res = $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'bhola-sadar', 'name' => 'Bhola Sadar', 'name_bn' => 'ভোলা সদর',
            'district_name' => 'Bhola', 'district_name_bn' => 'ভোলা',
            'division_id' => Division::where('name', 'Barishal')->value('id'),
        ])->assertCreated();

        $roles = collect($res->json('credentials'))->pluck('role')->all();
        $this->assertContains('uno', $roles);
        $this->assertContains('dc', $roles); // district with no DC yet → one is provisioned
        $this->assertDatabaseHas('users', ['username' => 'dc_bhola', 'role' => 'dc']);
    }

    public function test_new_upazila_can_create_district_inline(): void
    {
        Sanctum::actingAs($this->seal());
        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'mirpur',
            'name' => 'Mirpur',
            'name_bn' => 'মিরপুর',
            'district_name' => 'Kushtia',
            'district_name_bn' => 'কুষ্টিয়া',
            'division_id' => Division::where('name', 'Khulna')->value('id'),
        ])->assertCreated();

        $this->assertDatabaseHas('districts', ['name' => 'Kushtia']);
    }

    public function test_duplicate_slug_is_rejected(): void
    {
        Sanctum::actingAs($this->seal());
        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'galachipa', // already exists
            'name' => 'X', 'name_bn' => 'এক্স', 'district_id' => 1,
        ])->assertStatus(422);
    }

    public function test_invalid_slug_is_rejected(): void
    {
        Sanctum::actingAs($this->seal());
        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'Bad Slug!', 'name' => 'X', 'name_bn' => 'এক্স', 'district_id' => 1,
        ])->assertStatus(422);
    }

    public function test_non_seal_cannot_manage_instances(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/upazilas')->assertStatus(403);
        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'x', 'name' => 'X', 'name_bn' => 'এক্স', 'district_id' => 1,
        ])->assertStatus(403);
    }

    // ---- In-app switching (X-Upazila) ---------------------------------

    public function test_seal_switches_upazila_via_header_without_changing_host(): void
    {
        Sanctum::actingAs($this->seal());

        // No header on the admin host → tenant-less (aggregate context).
        $this->getJson(self::ADMIN.'/api/registry/active-upazila')
            ->assertOk()->assertJsonPath('upazila', null);

        // Same admin host, different X-Upazila → different tenant resolved.
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'galachipa'])
            ->assertOk()->assertJsonPath('upazila.id', 'galachipa');

        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertOk()->assertJsonPath('upazila.id', 'dumuria');
    }

    public function test_tenant_scoped_user_cannot_switch_via_header(): void
    {
        // A UNO bound to galachipa may not borrow dumuria's context via the header.
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertStatus(403);
    }

    public function test_dc_can_switch_within_district_only(): void
    {
        // Galachipa is in Patuakhali, Dumuria in Khulna — so each DC sees exactly its own.
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'galachipa'])
            ->assertOk()->assertJsonPath('upazila.id', 'galachipa');
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertStatus(403);

        Sanctum::actingAs(User::where('username', 'dc_khulna')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertOk()->assertJsonPath('upazila.id', 'dumuria');
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'galachipa'])
            ->assertStatus(403);
    }

    /**
     * An instance's identity — which real upazila it is, and therefore its subdomain — is fixed at
     * creation. Only the active flag may be edited; a rename or a district move would silently
     * repoint a live subdomain at somewhere else.
     */
    public function test_only_the_active_flag_is_editable(): void
    {
        Sanctum::actingAs($this->seal());

        $this->putJson(self::ADMIN.'/api/upazilas/galachipa', ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.name_bn', 'গলাচিপা');

        // Name and district submitted alongside are ignored, not applied.
        $patuakhali = \App\Models\District::where('name', 'Patuakhali')->value('id');
        $dhaka = \App\Models\District::where('name', 'Dhaka')->value('id');
        $this->putJson(self::ADMIN.'/api/upazilas/galachipa', [
            'is_active' => true,
            'name' => 'Hijacked',
            'name_bn' => 'ছিনতাই',
            'district_id' => $dhaka,
        ])->assertOk();

        $this->assertDatabaseHas('tenants', [
            'id' => 'galachipa',
            'name_bn' => 'গলাচিপা',
            'district_id' => $patuakhali,
        ]);
    }

    // ---- বিভাগ → জেলা → উপজেলা hierarchy ------------------------------

    /**
     * The instance admin's division dropdown filters districts client-side on division_id, so a
     * district with no division would silently vanish from every dropdown and render blank in the
     * roster. Pin the seeded hierarchy: eight divisions, all 64 districts mapped.
     */
    public function test_every_district_belongs_to_one_of_the_eight_divisions(): void
    {
        Sanctum::actingAs($this->seal());

        $this->getJson(self::ADMIN.'/api/registry/divisions')
            ->assertOk()
            ->assertJsonCount(8, 'divisions');

        $districts = $this->getJson(self::ADMIN.'/api/registry/districts')
            ->assertOk()
            ->json('districts');

        $this->assertCount(64, $districts);
        $this->assertEmpty(
            array_filter($districts, fn (array $d) => $d['division_id'] === null),
            'every district must be linked to a division',
        );
    }

    /**
     * The console never invents a subdomain: it submits the slug the catalogue assigns, which is
     * the upazila's own gov.bd label. Labels recur across districts (every district has a `sadar`;
     * Kaliganj is in four), so those are district-qualified — if that broke, two upazilas would
     * collide on one subdomain.
     */
    public function test_upazila_catalogue_slugs_are_unique_nationwide(): void
    {
        $slugs = \App\Models\UpazilaRef::pluck('slug');

        // 499 upazilas, per the national portal's own published count.
        $this->assertCount(499, $slugs);
        $this->assertCount(499, $slugs->unique(), 'every upazila needs its own subdomain');

        // A bare colliding label must never survive as a slug: 28 upazilas carry the gov.bd
        // label `sadar`, so all of them have to be district-qualified.
        $this->assertNull(\App\Models\UpazilaRef::where('slug', 'sadar')->first());
        $this->assertSame(28, \App\Models\UpazilaRef::where('slug', 'like', 'sadar-%')->count());

        // Kaliganj exists in four districts; each must resolve to a distinct subdomain.
        $kaliganj = \App\Models\UpazilaRef::where('name', 'Kaliganj')->pluck('slug');
        $this->assertCount(4, $kaliganj);
        $this->assertCount(4, $kaliganj->unique());
    }

    /** Options are district-scoped and flag the ones already provisioned. */
    public function test_upazila_options_are_scoped_and_flag_taken(): void
    {
        Sanctum::actingAs($this->seal());
        $khulna = \App\Models\District::where('name', 'Khulna')->firstOrFail();

        $options = $this->getJson(self::ADMIN."/api/registry/upazila-options?district_id={$khulna->id}")
            ->assertOk()
            ->json('upazilas');

        $this->assertNotEmpty($options);
        $bySlug = collect($options)->keyBy('slug');
        // Dumuria is seeded as a live instance, so it must come back flagged.
        $this->assertTrue($bySlug['dumuria']['taken']);
        $this->assertFalse($bySlug->first(fn ($o) => $o['slug'] !== 'dumuria')['taken']);

        $this->getJson(self::ADMIN.'/api/registry/upazila-options?district_id=999999')
            ->assertStatus(422);
    }

    /** The roster's বিভাগ column reads this nested payload. */
    public function test_upazila_payload_carries_its_division(): void
    {
        Sanctum::actingAs($this->seal());

        $this->getJson(self::ADMIN.'/api/upazilas/galachipa')
            ->assertOk()
            ->assertJsonPath('data.district.name_bn', 'পটুয়াখালী')
            ->assertJsonPath('data.district.division.name_bn', 'বরিশাল')
            ->assertJsonPath('data.domain', 'galachipa.suraha.net');
    }
}
