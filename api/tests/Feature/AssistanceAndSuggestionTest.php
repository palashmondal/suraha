<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * মানবিক সহায়তা and নাগরিক পরামর্শ: a citizen files from the public site, gets a tracking token,
 * and the UNO decides once. Both mirror the appointment lifecycle.
 */
class AssistanceAndSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private const GALACHIPA = 'http://galachipa.lvh.me';
    private const DUMURIA = 'http://dumuria.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function citizen(): User
    {
        return User::where('role', 'citizen')->firstOrFail();
    }

    private function uno(): User
    {
        return User::where('username', 'uno_galachipa')->firstOrFail();
    }

    public function test_citizen_applies_for_assistance_and_uno_approves_an_amount(): void
    {
        Sanctum::actingAs($this->citizen());

        $token = $this->postJson(self::GALACHIPA.'/api/assistances', [
            'applicant_name' => 'রহিমা বেগম',
            'kind' => 'financial',
            'title' => 'চিকিৎসার জন্য আর্থিক সহায়তা',
            'description' => 'হৃদরোগের অস্ত্রোপচার প্রয়োজন।',
            'mobile' => '01712345678',
            'amount_requested' => 25000,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.tracking_token');

        $this->assertStringStartsWith('SUR-AID-', $token);

        // The UNO may grant a different figure from the one asked for.
        $id = \App\Models\Assistance::where('tracking_token', $token)->value('id');

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/approve", [
            'amount_approved' => 15000,
            'decision_note' => 'আংশিক অনুমোদন।',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.amount_approved', 15000)
            ->assertJsonPath('data.amount_requested', 25000);

        // …and the citizen can follow it from the public site without logging in.
        $this->getJson(self::GALACHIPA.'/api/track/'.$token)
            ->assertOk()
            ->assertJsonPath('type', 'assistance')
            ->assertJsonPath('status', 'approved');
    }

    public function test_citizen_files_a_suggestion_and_uno_accepts_it(): void
    {
        Sanctum::actingAs($this->citizen());

        $token = $this->postJson(self::GALACHIPA.'/api/suggestions', [
            'applicant_name' => 'শাহীন আলম',
            'kind' => 'bridge',
            'title' => 'খেয়াঘাটে সেতু প্রয়োজন',
            'description' => 'প্রতিদিন শিক্ষার্থীরা নৌকায় পার হয়।',
        ])->assertCreated()->json('data.tracking_token');

        $id = \App\Models\Suggestion::where('tracking_token', $token)->value('id');

        Sanctum::actingAs($this->uno());
        $this->postJson(self::GALACHIPA."/api/suggestions/{$id}/accept", ['decision_note' => 'পরিকল্পনায় নেওয়া হলো।'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $this->getJson(self::GALACHIPA.'/api/track/'.$token)
            ->assertOk()
            ->assertJsonPath('type', 'suggestion');
    }

    /**
     * The point of a confidential channel is that the name does not travel with the suggestion,
     * so the API must not send it at all — hiding it in the UI would still ship it to the browser.
     */
    public function test_a_confidential_suggestion_never_sends_its_author(): void
    {
        Sanctum::actingAs($this->citizen());

        $token = $this->postJson(self::GALACHIPA.'/api/suggestions', [
            'applicant_name' => 'গোপন পরামর্শদাতা',
            'kind' => 'other',
            'title' => 'একটি গোপনীয় পরামর্শ',
            'description' => 'বিস্তারিত বিবরণ।',
            'mobile' => '01799998888',
            'is_confidential' => true,
        ])->assertCreated()
            ->assertJsonPath('data.applicant_name', null)
            ->json('data.tracking_token');

        Sanctum::actingAs($this->uno());
        $id = \App\Models\Suggestion::where('tracking_token', $token)->value('id');

        $row = $this->getJson(self::GALACHIPA."/api/suggestions/{$id}")->assertOk()->json('data');

        $this->assertTrue($row['is_confidential']);
        $this->assertNull($row['applicant_name']);
        $this->assertNull($row['mobile']);
        $this->assertSame('একটি গোপনীয় পরামর্শ', $row['title']);

        // Tracking shows the status without naming the author either.
        $this->getJson(self::GALACHIPA.'/api/track/'.$token)
            ->assertOk()
            ->assertJsonPath('applicant', 'গোপনীয়');
    }

    public function test_both_listings_are_tenant_scoped_and_tabbed(): void
    {
        Sanctum::actingAs($this->uno());

        foreach (['assistances', 'suggestions'] as $module) {
            $body = $this->getJson(self::GALACHIPA."/api/{$module}")->assertOk()->json();

            $this->assertNotEmpty($body['kinds'], "{$module} should offer category options");
            $this->assertSame(
                $body['meta']['total'],
                collect($body['tabs'])->firstWhere('key', 'all')['total'],
                "{$module}: the সকল tab should match the unfiltered total",
            );
        }

        // A UNO cannot read another upazila's applications.
        $this->getJson(self::DUMURIA.'/api/assistances')->assertStatus(403);
    }

    /** A DC may look at both modules and change neither. */
    public function test_dc_is_read_only_on_both_modules(): void
    {
        // The demo history seeder is skipped under tests, so make the row this needs.
        $id = \App\Models\Upazila::find('galachipa')
            ->run(fn () => \App\Models\Assistance::factory()->create()->id);

        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());

        $this->getJson(self::GALACHIPA.'/api/assistances')->assertOk();
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/approve")->assertStatus(403);
    }
}
