<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * অভিযোগ lifecycle — file → schedule → assign → findings → resolve, tabs, and role scoping
 * (investigators only see their own; UNO manages; DC read-only).
 */
class ComplaintTest extends TestCase
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

    private function investigator(): User
    {
        return User::where('username', 'tdonto_golachipa')->firstOrFail();
    }

    public function test_list_tabs_reflect_seeded_lifecycle(): void
    {
        Sanctum::actingAs($this->uno());
        $tabs = collect($this->getJson(self::GOLACHIPA.'/api/complaints')->json('tabs'))->keyBy('key');

        $this->assertSame(12, $tabs['all']['total']);       // 4+3+3+2
        $this->assertSame(4, $tabs['filed']['total']);
        $this->assertSame(3, $tabs['scheduled']['total']);
        $this->assertSame(3, $tabs['assigned']['total']);
        $this->assertSame(2, $tabs['resolved']['total']);
    }

    public function test_citizen_can_file_a_complaint(): void
    {
        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GOLACHIPA.'/api/complaints', [
            'title' => 'রাস্তায় ময়লা',
            'complainant_name' => 'নাগরিক',
            'ward_no' => 2,
        ])->assertCreated()->assertJsonPath('data.status', 'filed');
    }

    public function test_uno_runs_the_full_lifecycle(): void
    {
        $id = Upazila::find('golachipa')->run(fn () => Complaint::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/schedule", ['schedule_date' => '2026-08-10'])
            ->assertOk()->assertJsonPath('data.status', 'scheduled');

        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/assign", ['investigating_officer_id' => $this->investigator()->id])
            ->assertOk()->assertJsonPath('data.status', 'assigned')
            ->assertJsonPath('data.investigating_officer', $this->investigator()->name);

        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/resolve", ['resolution_note' => 'সমাধান হয়েছে'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');
    }

    public function test_assign_requires_an_investigating_officer_role(): void
    {
        $id = Upazila::find('golachipa')->run(fn () => Complaint::factory()->create()->id);
        Sanctum::actingAs($this->uno());
        // The UNO's own id is not an investigating officer → rejected.
        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/assign", ['investigating_officer_id' => $this->uno()->id])
            ->assertStatus(422);
    }

    public function test_investigator_only_sees_own_assignments_and_submits_findings(): void
    {
        Sanctum::actingAs($this->investigator());

        // Seeder assigned 5 complaints (3 assigned + 2 resolved) to this investigator.
        $res = $this->getJson(self::GOLACHIPA.'/api/complaints')->assertOk();
        $this->assertSame(5, $res->json('meta.total'));

        $id = $res->json('data.0.id');
        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/findings", ['findings' => 'তদন্ত সম্পন্ন'])
            ->assertOk()->assertJsonPath('data.findings', 'তদন্ত সম্পন্ন');
    }

    public function test_investigator_cannot_submit_findings_for_unassigned_complaint(): void
    {
        // A complaint assigned to nobody.
        $id = Upazila::find('golachipa')->run(fn () => Complaint::factory()->create()->id);
        Sanctum::actingAs($this->investigator());
        $this->postJson(self::GOLACHIPA."/api/complaints/{$id}/findings", ['findings' => 'x'])
            ->assertStatus(403);
    }

    public function test_dc_is_read_only_on_complaints(): void
    {
        $id = Upazila::find('golachipa')->run(fn () => Complaint::factory()->create()->id);
        Sanctum::actingAs(User::where('username', 'dc_barishal')->firstOrFail());
        // View allowed via header switch, but scheduling is blocked.
        $this->postJson('http://admin.lvh.me/api/complaints/'.$id.'/schedule', ['schedule_date' => '2026-08-10'], ['X-Upazila' => 'golachipa'])
            ->assertStatus(403);
    }
}
