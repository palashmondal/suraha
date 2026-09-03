<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Pregnancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * In-app notifications (§9): filing events notify the acting role within the upazila; the bell is
 * role-scoped and markable read.
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private const GALACHIPA = 'http://galachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_new_complaint_notifies_the_uno(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/complaints', ['title' => 'রাস্তা', 'complainant_name' => 'ক'])->assertCreated();

        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $res = $this->getJson(self::GALACHIPA.'/api/notifications')->assertOk();
        $titles = collect($res->json('notifications'))->pluck('title');
        $this->assertTrue($titles->contains('নতুন অভিযোগ দাখিল হয়েছে'));
    }

    public function test_new_appointment_notifies_the_uno(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/appointments', ['applicant_name' => 'ক', 'purpose' => 'ভূমি'])->assertCreated();

        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson(self::GALACHIPA.'/api/notifications')
            ->assertOk()->assertJsonFragment(['title' => 'নতুন সাক্ষাৎকারের আবেদন']);
    }

    public function test_new_mother_notifies_the_sochib_not_the_uno(): void
    {
        Sanctum::actingAs(User::where('username', 'fwa_galachipa')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/pregnancies', ['mother_name_bn' => 'নতুন মা'])->assertCreated();

        // Sochib sees it.
        Sanctum::actingAs(User::where('username', 'sochib_galachipa')->firstOrFail());
        $sochib = collect($this->getJson(self::GALACHIPA.'/api/notifications')->json('notifications'))->pluck('title');
        $this->assertTrue($sochib->contains('নতুন প্রসূতি তথ্য যুক্ত হয়েছে'));

        // UNO does not (role-targeted).
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $uno = collect($this->getJson(self::GALACHIPA.'/api/notifications')->json('notifications'))->pluck('detail');
        $this->assertFalse($uno->contains('নতুন মা'));
    }

    public function test_mark_all_read_clears_unread_count(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->assertGreaterThan(0, $this->getJson(self::GALACHIPA.'/api/notifications')->json('unread_count'));

        $this->postJson(self::GALACHIPA.'/api/notifications/read-all')->assertOk();
        $this->assertSame(0, $this->getJson(self::GALACHIPA.'/api/notifications')->json('unread_count'));
    }

    public function test_notifications_are_tenant_scoped(): void
    {
        // Galachipa's UNO has no business on Dumuria's subdomain at all. This used to return an
        // empty list — tenancy scoped the query, but nothing checked the token against the host,
        // so the same request against a module with rows would have read another upazila's data.
        // EnsureTenantAccess now refuses the pairing outright.
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());
        $this->getJson('http://dumuria.lvh.me/api/notifications')->assertStatus(403);

        // Their own upazila still works.
        $this->getJson(self::GALACHIPA.'/api/notifications')->assertOk();
    }
}
