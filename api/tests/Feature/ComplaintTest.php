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

        $this->assertSame(10, $tabs['all']['total']);   // 5 + 3 + 2
        $this->assertSame(5, $tabs['pending']['total']);
        $this->assertSame(3, $tabs['assigned']['total']);
        $this->assertSame(2, $tabs['completed']['total']);
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

    public function test_accept_requires_an_investigating_officer_role(): void
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

        // Seeder assigned 5 complaints (3 assigned + 2 completed) to this investigator.
        $res = $this->getJson(self::GALACHIPA.'/api/complaints')->assertOk();
        $this->assertSame(5, $res->json('meta.total'));

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

    public function test_dc_is_read_only_on_complaints(): void
    {
        $id = $this->newComplaintId();
        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());
        // View allowed via header switch, but accepting/appointing is blocked.
        $this->postJson('http://lvh.me/api/complaints/'.$id.'/accept', [
            'investigating_officer_id' => $this->investigator()->id, 'due_date' => now()->addWeek()->toDateString(),
        ], ['X-Upazila' => 'galachipa'])->assertStatus(403);
    }
}
