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

    private const GALACHIPA = 'http://galachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function uno(): User
    {
        return User::where('username', 'uno_galachipa')->firstOrFail();
    }

    public function test_tabs_reflect_seeded_data(): void
    {
        Sanctum::actingAs($this->uno());
        $tabs = collect($this->getJson(self::GALACHIPA.'/api/appointments')->json('tabs'))->keyBy('key');

        $this->assertSame(11, $tabs['all']['total']); // 5+4+2
        $this->assertSame(5, $tabs['pending']['total']);
        $this->assertSame(4, $tabs['approved']['total']);
        $this->assertSame(2, $tabs['rejected']['total']);
    }

    public function test_citizen_can_request_an_appointment(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/appointments', [
            'applicant_name' => 'নাগরিক',
            'purpose' => 'ভূমি সংক্রান্ত',
            'appointment_date' => now()->addWeek()->toDateString(),
        ])->assertCreated()->assertJsonPath('data.status', 'pending');
    }

    public function test_offline_replay_with_same_client_uuid_is_idempotent(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());

        $body = [
            'applicant_name' => 'নাগরিক',
            'purpose' => 'ভূমি সংক্রান্ত',
            'client_uuid' => '22222222-2222-4222-8222-222222222222',
        ];

        $first = $this->postJson(self::GALACHIPA.'/api/appointments', $body)->assertCreated();
        $second = $this->postJson(self::GALACHIPA.'/api/appointments', $body)->assertSuccessful();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Appointment::where('client_uuid', $body['client_uuid'])->count());
    }

    public function test_uno_accepts_with_a_modified_time(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        // UNO accepts but modifies the proposed time to fit the schedule.
        $slot = now()->addWeek()->toDateString();
        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/approve", [
            'appointment_date' => $slot,
            'appointment_time' => '11:30',
            'decision_note' => 'সকাল ১১:৩০ এ আসুন',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.appointment_date', $slot)
            ->assertJsonPath('data.appointment_time', '11:30');
    }

    public function test_accepted_appointment_appears_on_the_uno_schedule(): void
    {
        $slot = now()->addWeek()->toDateString();
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create(['appointment_date' => $slot])->id);
        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/approve", ['appointment_date' => $slot])->assertOk();

        $this->getJson(self::GALACHIPA.'/api/appointment-schedule')
            ->assertOk()
            ->assertJsonFragment(['id' => $id]);
    }

    public function test_uno_rejects(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/reject", ['decision_note' => 'সময় নেই'])
            ->assertOk()->assertJsonPath('data.status', 'rejected');
    }

    public function test_dc_is_read_only(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        $this->postJson('http://lvh.me/api/appointments/'.$id.'/approve', [], ['X-Upazila' => 'galachipa'])
            ->assertStatus(403);
    }
}
