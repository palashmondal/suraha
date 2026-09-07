<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\ComplaintEvent;
use App\Models\Note;
use App\Models\Pregnancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Unified search (§ top-bar box). SEAL on "সকল উপজেলা" has no tenant resolved — the box used to
 * 400 there, so the search was hidden for that view; it now spans every upazila SEAL oversees.
 */
class SearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_seal_searches_across_every_upazila_when_none_is_selected(): void
    {
        Sanctum::actingAs(User::where('role', 'seal_admin')->firstOrFail());

        foreach (['galachipa', 'dumuria'] as $tenant) {
            // forceCreate: tenant_id is guarded — normally BelongsToTenant fills it.
            Pregnancy::withoutGlobalScopes()->forceCreate([
                'tenant_id' => $tenant,
                'mother_name_bn' => "খুঁজি মা {$tenant}",
                'mobile' => '01700000000',
            ]);
        }

        $names = collect($this->getJson('http://lvh.me/api/search?q='.rawurlencode('খুঁজি'))->assertOk()->json('results'))
            ->pluck('name');

        $this->assertContains('খুঁজি মা galachipa', $names);
        $this->assertContains('খুঁজি মা dumuria', $names);

        // Picking one upazila narrows it back to that upazila's records.
        $narrowed = collect(
            $this->getJson('http://lvh.me/api/search?q='.rawurlencode('খুঁজি'), ['X-Upazila' => 'galachipa'])
                ->assertOk()->json('results')
        )->pluck('name');

        $this->assertContains('খুঁজি মা galachipa', $narrowed);
        $this->assertNotContains('খুঁজি মা dumuria', $narrowed);
    }

    /** What an office WROTE on a case is searchable too, not just what a citizen filed. */
    public function test_search_reaches_notes_and_the_complaint_timeline(): void
    {
        Sanctum::actingAs(User::where('role', 'seal_admin')->firstOrFail());

        $complaint = Complaint::withoutGlobalScopes()->firstOrFail();
        ComplaintEvent::withoutGlobalScopes()->forceCreate([
            'complaint_id' => $complaint->id,
            'tenant_id' => $complaint->tenant_id,
            'type' => 'report',
            'comment' => 'তদন্তে দেখা গেছে বিরল-শব্দ ঘটেছে',
        ]);
        Note::withoutGlobalScopes()->forceCreate([
            'tenant_id' => $complaint->tenant_id,
            'notable_type' => \App\Models\Appointment::class,
            'notable_id' => 1,
            'body' => 'সাক্ষাতে বিরল-শব্দ আলোচনা হয়েছে',
        ]);

        $links = collect($this->getJson('http://lvh.me/api/search?q='.rawurlencode('বিরল-শব্দ'))
            ->assertOk()->json('results'))->pluck('link');

        $this->assertContains('/complaint/'.$complaint->id, $links);
        $this->assertContains('/appointment/1', $links);
    }
}
