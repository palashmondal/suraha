<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * অভিযোগ lifecycle — file (pending) → accept & appoint (assigned) → report → schedule hearing →
 * order (complete / re-investigate), tabs, timeline, and role scoping (investigators only see
 * their own; UNO manages; DC read-only).
 */
class ComplaintTest extends TestCase
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

    private function investigator(): User
    {
        return User::where('username', 'tdonto_galachipa')->firstOrFail();
    }

    private function sochib(): User
    {
        return User::where('username', 'sochib_galachipa')->firstOrFail();
    }

    private function newComplaintId(): int
    {
        return Upazila::find('galachipa')->run(function () {
            $c = Complaint::factory()->create();
            $c->events()->create(['type' => 'filed']);

            return $c->id;
        });
    }

    public function test_list_tabs_reflect_seeded_lifecycle(): void
    {
        Sanctum::actingAs($this->uno());
        $tabs = collect($this->getJson(self::GALACHIPA.'/api/complaints')->json('tabs'))->keyBy('key');

        // Counted from the seeded rows rather than hard-coded totals, which went stale every time
        // the seeder grew. শুনানি নির্ধারিত is assigned + a hearing date, so নিযুক্ত must exclude
        // those — the five tabs partition the register, and সকল is exactly their sum.
        $expected = Upazila::find('galachipa')->run(fn () => [
            'pending' => Complaint::where('status', 'pending')->count(),
            'assigned' => Complaint::where('status', 'assigned')->whereNull('hearing_date')->count(),
            'hearing_scheduled' => Complaint::where('status', 'assigned')->whereNotNull('hearing_date')->count(),
            'completed' => Complaint::where('status', 'completed')->count(),
            'rejected' => Complaint::where('status', 'rejected')->count(),
        ]);

        foreach ($expected as $key => $total) {
            $this->assertSame($total, $tabs[$key]['total'], "the {$key} tab");
        }

        $this->assertGreaterThan(0, $expected['hearing_scheduled'], 'the seeder should schedule some hearings');
        $this->assertSame(array_sum($expected), $tabs['all']['total']);
    }

    public function test_citizen_can_file_a_complaint(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA.'/api/complaints', [
            'title' => 'রাস্তায় ময়লা',
            'complainant_name' => 'নাগরিক',
            'ward_no' => 2,
        ])->assertCreated()->assertJsonPath('data.status', 'pending');
    }

    public function test_offline_replay_with_same_client_uuid_is_idempotent(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());

        $body = [
            'title' => 'রাস্তায় ময়লা',
            'complainant_name' => 'নাগরিক',
            'ward_no' => 2,
            'client_uuid' => '11111111-1111-4111-8111-111111111111',
        ];

        // First send creates the complaint; a retried send (lost response) with the same client_uuid
        // must resolve to the same row rather than duplicate it (offline outbox replay).
        $first = $this->postJson(self::GALACHIPA.'/api/complaints', $body)->assertCreated();
        // The replay finds the existing row (200 found, not 201 created) — and does not duplicate it.
        $second = $this->postJson(self::GALACHIPA.'/api/complaints', $body)->assertSuccessful();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Complaint::where('client_uuid', $body['client_uuid'])->count());
    }

    public function test_uno_runs_the_full_lifecycle(): void
    {
        Storage::fake('public');
        $id = $this->newComplaintId();
        $officer = $this->investigator();

        // UNO accepts & appoints with a due date.
        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $officer->id,
            'due_date' => now()->addWeek()->toDateString(),
            'comment' => 'দ্রুত তদন্ত করুন',
        ])->assertOk()
            ->assertJsonPath('data.status', 'assigned')
            ->assertJsonPath('data.investigating_officer', $officer->name);

        // Officer submits a report with a PDF + an image.
        Sanctum::actingAs($officer);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", [
            'comment' => 'তদন্ত প্রতিবেদন সংযুক্ত',
            'document' => UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
            'images' => [UploadedFile::fake()->image('site.jpg')],
        ])->assertOk()->assertJsonPath('data.status', 'assigned');

        $this->assertSame(2, \DB::table('complaint_attachments')->count());

        // UNO schedules a hearing, then completes with an order.
        Sanctum::actingAs($this->uno());
        $hearing = now()->addWeek()->toDateString();
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => $hearing])
            ->assertOk()->assertJsonPath('data.hearing_date', $hearing);

        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/complete", ['comment' => 'নিষ্পত্তি করা হলো'])
            ->assertOk()->assertJsonPath('data.status', 'completed');

        // Timeline reflects every step in order.
        $types = collect($this->getJson(self::GALACHIPA."/api/complaints/{$id}")->json('data.timeline'))->pluck('type');
        $this->assertSame(['filed', 'accepted', 'report', 'hearing_scheduled', 'completed'], $types->all());
    }

    public function test_uno_can_order_reinvestigation(): void
    {
        $id = $this->newComplaintId();
        $officer = $this->investigator();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $officer->id, 'due_date' => now()->addWeek()->toDateString(),
        ])->assertOk();

        Sanctum::actingAs($officer);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'প্রথম প্রতিবেদন'])->assertOk();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => now()->addWeek()->toDateString()])->assertOk();
        // Re-investigation keeps it assigned and clears the hearing date.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/reinvestigate", ['comment' => 'আরও তথ্য প্রয়োজন'])
            ->assertOk()
            ->assertJsonPath('data.status', 'assigned')
            ->assertJsonPath('data.hearing_date', null);
    }

    public function test_accept_rejects_a_role_that_cannot_investigate(): void
    {
        $id = $this->newComplaintId();
        Sanctum::actingAs($this->uno());
        // The UNO's own id is not an investigating officer → rejected.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $this->uno()->id, 'due_date' => now()->addWeek()->toDateString(),
        ])->assertStatus(422);
    }

    public function test_investigator_only_sees_own_assignments_and_submits_report(): void
    {
        Sanctum::actingAs($this->investigator());

        // The list is scoped to this officer's own desk — nothing more, nothing less.
        $mine = Upazila::find('galachipa')->run(
            fn () => Complaint::where('investigating_officer_id', $this->investigator()->id)->count(),
        );

        $res = $this->getJson(self::GALACHIPA.'/api/complaints')->assertOk();
        $this->assertGreaterThan(0, $mine, 'the seeder should assign this investigator some work');
        $this->assertSame($mine, $res->json('meta.total'));

        $id = $res->json('data.0.id');
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'তদন্ত সম্পন্ন'])
            ->assertOk()->assertJsonPath('data.status', 'assigned');
    }

    public function test_investigator_cannot_report_on_unassigned_complaint(): void
    {
        $id = $this->newComplaintId(); // assigned to nobody
        Sanctum::actingAs($this->investigator());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'x'])
            ->assertStatus(403);
    }

    /** The Google-Calendar-subscribable শুনানি feed (§8.4, optional). */
    public function test_hearing_calendar_feed_serves_scheduled_hearings(): void
    {
        Sanctum::actingAs($this->uno());

        $feedUrl = $this->getJson(self::GALACHIPA.'/api/complaint-hearings')->json('feed_url');
        $this->assertStringContainsString('/api/complaints/hearings.ics?t=', $feedUrl);

        $body = $this->get($feedUrl)->assertOk()
            ->assertHeader('Content-Type', 'text/calendar; charset=utf-8')
            ->getContent();

        $expected = Upazila::find('galachipa')->run(
            fn () => Complaint::where('status', 'assigned')->whereNotNull('hearing_date')->get(),
        );

        $this->assertGreaterThan(0, $expected->count());
        $this->assertSame($expected->count(), substr_count($body, 'BEGIN:VEVENT'));
        // A hearing has a date but no time, so it lands as an all-day event.
        $this->assertStringContainsString('DTSTART;VALUE=DATE:', $body);
        $this->assertStringNotContainsString('DTSTART:', $body);
        $this->assertStringContainsString('SUMMARY:অভিযোগ শুনানি: ', $body);
        $this->assertStringContainsString('LOCATION:উপজেলা নির্বাহী অফিসারের কার্যালয়\\, গলাচিপা\\, পটুয়াখালী', $body);

        $this->get(self::GALACHIPA.'/api/complaints/hearings.ics?t=wrong')->assertNotFound();
    }

    /** The officer page filters the same তালিকা down to one desk. */
    public function test_list_can_be_filtered_to_one_investigating_officer(): void
    {
        Sanctum::actingAs($this->uno());
        $officer = $this->investigator();

        $mine = Upazila::find('galachipa')->run(
            fn () => Complaint::where('investigating_officer_id', $officer->id)->count(),
        );
        $this->assertGreaterThan(0, $mine);

        $res = $this->getJson(self::GALACHIPA."/api/complaints?officer={$officer->id}")->assertOk();
        $this->assertSame($mine, $res->json('meta.total'));

        foreach ($res->json('data') as $row) {
            $this->assertSame($officer->id, $row['investigating_officer_id']);
        }

        // An investigator cannot use the param to see someone else's desk.
        Sanctum::actingAs($officer);
        $other = User::where('role', 'investigating_officer')->where('id', '!=', $officer->id)->first();
        if ($other) {
            $this->getJson(self::GALACHIPA."/api/complaints?officer={$other->id}")
                ->assertOk()->assertJsonPath('meta.total', 0);
        }
    }

    /** A শুনানি sits on the report — the UI hides the button, but the API is what enforces it. */
    public function test_hearing_cannot_be_scheduled_before_the_report(): void
    {
        $id = $this->newComplaintId();
        $officer = $this->investigator();
        $when = now()->addWeek()->toDateString();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $officer->id, 'due_date' => $when,
        ])->assertOk();

        // Appointed, but nothing investigated yet.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => $when])
            ->assertStatus(422);

        Sanctum::actingAs($officer);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'প্রতিবেদন'])->assertOk();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => $when])
            ->assertOk()->assertJsonPath('data.hearing_date', $when);

        // A পুনঃতদন্ত puts the case back with the officer, so the next hearing needs a new report.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/reinvestigate", ['comment' => 'আরও তথ্য'])->assertOk();
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => $when])
            ->assertStatus(422);
    }

    /** A পুনঃতদন্ত may go back to the same officer, or to a different one. */
    public function test_reinvestigation_can_hand_the_case_to_another_officer(): void
    {
        $id = $this->newComplaintId();
        $first = $this->investigator();
        $when = now()->addWeek()->toDateString();

        $second = Upazila::find('galachipa')->run(fn () => User::factory()->create([
            'role' => 'investigating_officer',
            'name' => 'দ্বিতীয় তদন্ত কর্মকর্তা',
            'tenant_id' => 'galachipa',
            // The column defaults to true in the database, but the in-memory model would carry
            // null — and EnsureRole answers 401 for an inactive user.
            'is_active' => true,
        ]));

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $first->id, 'due_date' => $when,
        ])->assertOk();

        Sanctum::actingAs($first);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'প্রতিবেদন'])->assertOk();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/schedule-hearing", ['hearing_date' => $when])->assertOk();

        // Handed on to someone else.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/reinvestigate", [
            'comment' => 'নতুন কর্মকর্তা দিয়ে পুনঃতদন্ত',
            'investigating_officer_id' => $second->id,
        ])->assertOk()->assertJsonPath('data.investigating_officer', $second->name);

        // Omitting the officer leaves the case where it is.
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", [])->assertStatus(403);
        Sanctum::actingAs($second);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'দ্বিতীয় প্রতিবেদন'])->assertOk();

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/reinvestigate", ['comment' => 'আবার দেখুন'])
            ->assertOk()->assertJsonPath('data.investigating_officer', $second->name);
    }

    public function test_dc_is_read_only_on_complaints(): void
    {
        $id = $this->newComplaintId();
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        // View allowed via header switch, but accepting/appointing is blocked.
        $this->postJson('http://lvh.me/api/complaints/'.$id.'/accept', [
            'investigating_officer_id' => $this->investigator()->id, 'due_date' => now()->addWeek()->toDateString(),
        ], ['X-Upazila' => 'galachipa'])->assertStatus(403);
    }

    /**
     * A ইউপি সচিব investigates alongside their union work: the UNO can appoint one, the সচিব
     * sees that case (and only that case) on their own desk, and can file the report.
     */
    public function test_sochib_can_be_appointed_and_works_own_caseload(): void
    {
        $id = $this->newComplaintId();
        $sochib = $this->sochib();

        Sanctum::actingAs($this->uno());
        $this->getJson(self::GALACHIPA.'/api/complaint-investigators')
            ->assertOk()->assertJsonFragment(['id' => $sochib->id]);
        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/accept", [
            'investigating_officer_id' => $sochib->id,
            'due_date' => now()->addWeek()->toDateString(),
        ])->assertOk()->assertJsonPath('data.status', 'assigned');

        Sanctum::actingAs($sochib);
        $res = $this->getJson(self::GALACHIPA.'/api/complaints')->assertOk();
        $this->assertSame(1, $res->json('meta.total'), 'the সচিব desk shows only their own case');
        $this->assertSame($id, $res->json('data.0.id'));

        $this->postJson(self::GALACHIPA."/api/complaints/{$id}/report", ['comment' => 'তদন্ত প্রতিবেদন'])
            ->assertOk();
    }

    /** The detail route must scope to the assignee too, not just the listing. */
    public function test_investigating_role_cannot_open_someone_elses_complaint(): void
    {
        $id = $this->newComplaintId(); // assigned to nobody

        Sanctum::actingAs($this->investigator());
        $this->getJson(self::GALACHIPA."/api/complaints/{$id}")->assertStatus(403);

        Sanctum::actingAs($this->sochib());
        $this->getJson(self::GALACHIPA."/api/complaints/{$id}")->assertStatus(403);

        // The UNO is not an investigating role, so the same record still opens for them.
        Sanctum::actingAs($this->uno());
        $this->getJson(self::GALACHIPA."/api/complaints/{$id}")->assertOk();
    }
}
