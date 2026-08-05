<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * সাক্ষাৎকার — citizen request → UNO approve/reject/reschedule, tabs, and role gating.
 */
class AppointmentTest extends TestCase
{
    use RefreshDatabase;

    private const GOLACHIPA = 'http://golachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function uno(): User
    {
        return User::where('username', 'uno_golachipa')->firstOrFail();
    }

    public function test_tabs_reflect_seeded_data(): void
    {
        Sanctum::actingAs($this->uno());
        $tabs = collect($this->getJson(self::GOLACHIPA.'/api/appointments')->json('tabs'))->keyBy('key');

        $this->assertSame(11, $tabs['all']['total']); // 5+4+2
        $this->assertSame(5, $tabs['pending']['total']);
        $this->assertSame(4, $tabs['approved']['total']);
        $this->assertSame(2, $tabs['rejected']['total']);
    }

    public function test_citizen_can_request_an_appointment(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GOLACHIPA.'/api/appointments', [
            'applicant_name' => 'নাগরিক',
            'purpose' => 'ভূমি সংক্রান্ত',
            'appointment_date' => '2026-08-20',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');
    }

    public function test_uno_approves_rejects_and_reschedules(): void
    {
        $id = Upazila::find('golachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $this->postJson(self::GOLACHIPA."/api/appointments/{$id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->postJson(self::GOLACHIPA."/api/appointments/{$id}/reschedule", ['appointment_date' => '2026-09-01'])
            ->assertOk()->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.appointment_date', '2026-09-01');

        $this->postJson(self::GOLACHIPA."/api/appointments/{$id}/reject")
            ->assertOk()->assertJsonPath('data.status', 'rejected');
    }

    public function test_dc_is_read_only(): void
    {
        $id = Upazila::find('golachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs(User::where('username', 'dc_barishal')->firstOrFail());
        $this->postJson('http://admin.lvh.me/api/appointments/'.$id.'/approve', [], ['X-Upazila' => 'golachipa'])
            ->assertStatus(403);
    }
}
