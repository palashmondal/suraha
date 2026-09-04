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

        // Counted against the seeded rows rather than hard-coded totals, which went stale every
        // time the seeder grew. What matters is that সকল is exactly the three tabs put together.
        $expected = Upazila::find('galachipa')->run(
            fn () => Appointment::query()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status'),
        );

        foreach (['pending', 'approved', 'rejected'] as $status) {
            $this->assertGreaterThan(0, $expected[$status], "the seeder should leave some {$status} rows");
            $this->assertSame((int) $expected[$status], $tabs[$status]['total']);
        }

        $this->assertSame((int) $expected->sum(), $tabs['all']['total']);
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

    public function test_uno_keeps_multiple_dated_notes_and_a_citizen_cannot(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/notes", ['body' => 'সাক্ষাৎ সম্পন্ন হয়েছে।'])
            ->assertOk()->assertJsonPath('data.notes.0.body', 'সাক্ষাৎ সম্পন্ন হয়েছে।');

        // A second note appends rather than replacing — that is the whole point of the timeline.
        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/notes", ['body' => 'এসিল্যান্ডকে অবহিত করতে হবে।'])
            ->assertOk()->assertJsonCount(2, 'data.notes')
            ->assertJsonPath('data.notes.1.body', 'এসিল্যান্ডকে অবহিত করতে হবে।');

        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/notes", [])->assertStatus(422);

        // The notes are the UNO's own; an applicant has no business writing them.
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA."/api/appointments/{$id}/notes", ['body' => 'যাই হোক'])
            ->assertStatus(403);
    }

    /** A note is the UNO's own memo, not part of the decision — it can be kept at any status. */
    public function test_notes_can_be_added_at_any_status(): void
    {
        Sanctum::actingAs($this->uno());

        foreach (['pending', 'approved', 'rejected'] as $status) {
            $id = Upazila::find('galachipa')->run(
                fn () => Appointment::factory()->create(['status' => $status])->id,
            );

            $this->postJson(self::GALACHIPA."/api/appointments/{$id}/notes", ['body' => "নোট — {$status}"])
                ->assertOk()
                ->assertJsonPath('data.status', $status)          // the note leaves the status alone
                ->assertJsonPath('data.notes.0.body', "নোট — {$status}");
        }
    }

    /**
     * SEAL works from the central host, where the "সকল উপজেলা" view resolves no tenant. The note
     * must still land in the appointment's own upazila rather than with a null tenant_id.
     */
    public function test_seal_can_note_from_the_central_host_without_a_selected_upazila(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs(User::where('role', 'seal_admin')->firstOrFail());

        $this->postJson("http://lvh.me/api/appointments/{$id}/notes", ['body' => 'কেন্দ্রীয় নোট'])
            ->assertOk()
            ->assertJsonPath('data.notes.0.body', 'কেন্দ্রীয় নোট');

        $this->assertDatabaseHas('notes', [
            'notable_type' => \App\Models\Appointment::class,
            'notable_id' => $id,
            'tenant_id' => 'galachipa',
        ]);
    }

    public function test_uno_deletes_a_note_but_not_one_from_another_appointment(): void
    {
        [$idA, $idB] = Upazila::find('galachipa')->run(fn () => [
            Appointment::factory()->create()->id,
            Appointment::factory()->create()->id,
        ]);
        Sanctum::actingAs($this->uno());

        $noteId = $this->postJson(self::GALACHIPA."/api/appointments/{$idA}/notes", ['body' => 'ভুল নোট'])
            ->json('data.notes.0.id');

        // The note belongs to A, so reaching it through B must not work.
        $this->deleteJson(self::GALACHIPA."/api/appointments/{$idB}/notes/{$noteId}")->assertNotFound();
        $this->assertDatabaseHas('notes', ['id' => $noteId]);

        $this->deleteJson(self::GALACHIPA."/api/appointments/{$idA}/notes/{$noteId}")
            ->assertOk()->assertJsonCount(0, 'data.notes');
        $this->assertDatabaseMissing('notes', ['id' => $noteId]);
    }

    public function test_dc_is_read_only(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Appointment::factory()->create()->id);
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        $this->postJson('http://lvh.me/api/appointments/'.$id.'/approve', [], ['X-Upazila' => 'galachipa'])
            ->assertStatus(403);
    }
}
