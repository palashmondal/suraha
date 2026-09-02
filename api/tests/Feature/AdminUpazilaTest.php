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
            ->assertJsonCount(2, 'data'); // golachipa + dumuria from the seeder
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

        // Barishal already has dc_barishal from the seeder → no new DC provisioned.
        $barishalId = \App\Models\District::where('name', 'Barishal')->value('id');
        $res = $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'kalapara', 'name' => 'Kalapara', 'name_bn' => 'কলাপাড়া', 'district_id' => $barishalId,
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
            'slug' => 'sadar', 'name' => 'Sadar', 'name_bn' => 'সদর',
            'district_name' => 'Patuakhali', 'district_name_bn' => 'পটুয়াখালী',
            'division_id' => Division::where('name', 'Barishal')->value('id'),
        ])->assertCreated();

        $roles = collect($res->json('credentials'))->pluck('role')->all();
        $this->assertContains('uno', $roles);
        $this->assertContains('dc', $roles); // brand-new district → DC provisioned
        $this->assertDatabaseHas('users', ['username' => 'dc_patuakhali', 'role' => 'dc']);
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
            'slug' => 'golachipa', // already exists
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
        Sanctum::actingAs(User::where('username', 'uno_golachipa')->firstOrFail());
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
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'golachipa'])
            ->assertOk()->assertJsonPath('upazila.id', 'golachipa');

        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertOk()->assertJsonPath('upazila.id', 'dumuria');
    }

    public function test_tenant_scoped_user_cannot_switch_via_header(): void
    {
        // A UNO bound to golachipa may not borrow dumuria's context via the header.
        Sanctum::actingAs(User::where('username', 'uno_golachipa')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertStatus(403);
    }

    public function test_dc_can_switch_within_district_only(): void
    {
        Sanctum::actingAs(User::where('username', 'dc_barishal')->firstOrFail());

        // Both seeded upazilas are in Barishal → allowed.
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'dumuria'])
            ->assertOk()->assertJsonPath('upazila.id', 'dumuria');

        // Create an out-of-district upazila, then the DC must be refused it.
        Sanctum::actingAs($this->seal());
        $this->postJson(self::ADMIN.'/api/upazilas', [
            'slug' => 'mirpur', 'name' => 'Mirpur', 'name_bn' => 'মিরপুর',
            'district_name' => 'Kushtia', 'district_name_bn' => 'কুষ্টিয়া',
            'division_id' => Division::where('name', 'Khulna')->value('id'),
        ])->assertCreated();

        Sanctum::actingAs(User::where('username', 'dc_barishal')->firstOrFail());
        $this->getJson(self::ADMIN.'/api/registry/active-upazila', ['X-Upazila' => 'mirpur'])
            ->assertStatus(403);
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

    /** The roster's বিভাগ column reads this nested payload. */
    public function test_upazila_payload_carries_its_division(): void
    {
        Sanctum::actingAs($this->seal());

        $this->getJson(self::ADMIN.'/api/upazilas/golachipa')
            ->assertOk()
            ->assertJsonPath('data.district.name_bn', 'বরিশাল')
            ->assertJsonPath('data.district.division.name_bn', 'বরিশাল')
            ->assertJsonPath('data.domain', 'golachipa.suraha.net');
    }
}
