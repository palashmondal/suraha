<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Assistance;
use App\Models\Complaint;
use App\Models\Pregnancy;
use App\Models\Suggestion;
use App\Models\Upazila;
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

    /** সংযুক্তি: the citizen's own photos/PDFs, uploaded right after the record is created. */
    public function test_citizen_attaches_files_to_own_submission_only(): void
    {
        Sanctum::actingAs($this->citizen());

        $id = $this->postJson(self::GALACHIPA.'/api/assistances', [
            'applicant_name' => 'রহিমা বেগম',
            'kind' => 'medical',
            'title' => 'চিকিৎসা সহায়তা',
        ])->assertCreated()->json('data.id');

        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/attachments", [
            'files' => [
                \Illuminate\Http\UploadedFile::fake()->image('ghatana.jpg'),
                \Illuminate\Http\UploadedFile::fake()->create('kagoj.pdf', 40, 'application/pdf'),
            ],
        ])->assertCreated()->assertJsonCount(2, 'attachments')
            ->assertJsonPath('attachments.1.kind', 'pdf');

        // The officer detail page is what renders them.
        Sanctum::actingAs($this->uno());
        $this->getJson(self::GALACHIPA."/api/assistances/{$id}")
            ->assertOk()->assertJsonCount(2, 'data.attachments');
        Sanctum::actingAs($this->citizen());

        // A .exe is not a photo, and one citizen may not attach to another's application.
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/attachments", [
            'files' => [\Illuminate\Http\UploadedFile::fake()->create('x.exe', 10)],
        ])->assertStatus(422);

        $other = Upazila::find('galachipa')->run(fn () => Assistance::factory()->create()->id);
        $this->postJson(self::GALACHIPA."/api/assistances/{$other}/attachments", [
            'files' => [\Illuminate\Http\UploadedFile::fake()->image('a.jpg')],
        ])->assertStatus(403);
    }

    /** Filing a পরামর্শ sends the citizen a thank-you SMS carrying the tracking token. */
    public function test_citizen_gets_a_thank_you_sms_on_submitting_a_suggestion(): void
    {
        Sanctum::actingAs($this->citizen());

        // The dev gateway only logs; capture the sends instead of grepping a log file.
        $sent = [];
        $this->app->instance(\App\Services\Sms\SmsGateway::class, new class($sent) implements \App\Services\Sms\SmsGateway
        {
            public function __construct(private array &$sent) {}

            public function send(string $phone, string $message, string $purpose = 'other'): void
            {
                $this->sent[] = [$phone, $message, $purpose];
            }
        });

        $token = $this->postJson(self::GALACHIPA.'/api/suggestions', [
            'applicant_name' => 'রোকসানা পারভীন',
            'kind' => 'health',
            'title' => 'কমিউনিটি ক্লিনিকে চিকিৎসক নিয়োগ',
            'description' => 'নিয়মিত চিকিৎসক না থাকায় সেবা মিলছে না।',
            'mobile' => '01712345678',
        ])->assertCreated()->json('data.tracking_token');

        $this->assertNotEmpty($sent);
        [$phone, $message, $purpose] = $sent[0];
        $this->assertSame('01712345678', $phone);
        $this->assertSame('suggestion', $purpose);
        $this->assertStringContainsString($token, $message);
    }

    /** The same গুরুত্বপূর্ণ mark on an aid application, with its own tab. */
    public function test_uno_marks_an_assistance_important_and_the_tab_filters_on_it(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Assistance::factory()->create(['is_important' => false])->id);
        Sanctum::actingAs($this->uno());

        $this->patchJson(self::GALACHIPA."/api/assistances/{$id}/important", ['is_important' => true])
            ->assertOk()->assertJsonPath('data.is_important', true);

        $important = $this->getJson(self::GALACHIPA.'/api/assistances?status=important')->assertOk();
        $this->assertContains($id, collect($important->json('data'))->pluck('id')->all());

        // Marked while অপেক্ষমান, still marked after the decision.
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/approve", ['amount_approved' => 5000])
            ->assertOk()->assertJsonPath('data.is_important', true);

        Sanctum::actingAs($this->citizen());
        $this->patchJson(self::GALACHIPA."/api/assistances/{$id}/important", ['is_important' => false])
            ->assertStatus(403);
    }

    /** গুরুত্বপূর্ণ is the UNO's mark, not a status: it survives a decision and has its own tab. */
    public function test_uno_marks_a_suggestion_important_and_the_tab_filters_on_it(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Suggestion::factory()->create(['is_important' => false])->id);
        Sanctum::actingAs($this->uno());

        $this->patchJson(self::GALACHIPA."/api/suggestions/{$id}/important", ['is_important' => true])
            ->assertOk()->assertJsonPath('data.is_important', true);

        $important = $this->getJson(self::GALACHIPA.'/api/suggestions?status=important')->assertOk();
        $this->assertContains($id, collect($important->json('data'))->pluck('id')->all());
        foreach ($important->json('data') as $row) {
            $this->assertTrue($row['is_important']);
        }

        // The mark stays on after the UNO decides, and comes back off on request.
        $this->postJson(self::GALACHIPA."/api/suggestions/{$id}/accept")
            ->assertOk()->assertJsonPath('data.is_important', true);

        $this->patchJson(self::GALACHIPA."/api/suggestions/{$id}/important", ['is_important' => false])
            ->assertOk()->assertJsonPath('data.is_important', false);

        // A citizen cannot mark their own suggestion important.
        Sanctum::actingAs($this->citizen());
        $this->patchJson(self::GALACHIPA."/api/suggestions/{$id}/important", ['is_important' => true])
            ->assertStatus(403);
    }

    /** কার্যক্রম notes: the UNO's running record on one application; a citizen may not write them. */
    /** পরামর্শ notes ride the same shared table and trait as সাক্ষাৎকার and সহায়তা. */
    public function test_uno_keeps_suggestion_notes_and_a_citizen_cannot(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Suggestion::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $noteId = $this->postJson(self::GALACHIPA."/api/suggestions/{$id}/notes", ['body' => 'ইউএনও মহোদয়ের নোট'])
            ->assertOk()->assertJsonPath('data.notes.0.body', 'ইউএনও মহোদয়ের নোট')
            ->json('data.notes.0.id');

        $this->postJson(self::GALACHIPA."/api/suggestions/{$id}/notes", [])->assertStatus(422);

        $this->deleteJson(self::GALACHIPA."/api/suggestions/{$id}/notes/{$noteId}")
            ->assertOk()->assertJsonCount(0, 'data.notes');

        Sanctum::actingAs(User::where('role', 'citizen')->firstOrFail());
        $this->postJson(self::GALACHIPA."/api/suggestions/{$id}/notes", ['body' => 'যাই হোক'])
            ->assertStatus(403);
    }

    public function test_uno_keeps_assistance_notes_and_a_citizen_cannot(): void
    {
        $id = Upazila::find('galachipa')->run(fn () => Assistance::factory()->create()->id);
        Sanctum::actingAs($this->uno());

        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/notes", ['body' => 'তদন্ত শুরু হয়েছে।'])
            ->assertOk()->assertJsonPath('data.notes.0.body', 'তদন্ত শুরু হয়েছে।');

        $noteId = $this->postJson(self::GALACHIPA."/api/assistances/{$id}/notes", ['body' => 'চেক ইস্যু করা হলো।'])
            ->assertOk()->assertJsonCount(2, 'data.notes')
            ->json('data.notes.1.id');

        $this->deleteJson(self::GALACHIPA."/api/assistances/{$id}/notes/{$noteId}")
            ->assertOk()->assertJsonCount(1, 'data.notes');

        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/notes", [])->assertStatus(422);

        Sanctum::actingAs($this->citizen());
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/notes", ['body' => 'যাই হোক'])
            ->assertStatus(403);
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
        $id = Assistance::where('tracking_token', $token)->value('id');

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

        $id = Suggestion::where('tracking_token', $token)->value('id');

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
        $id = Suggestion::where('tracking_token', $token)->value('id');

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

    public function test_assistance_offline_replay_with_same_client_uuid_is_idempotent(): void
    {
        Sanctum::actingAs($this->citizen());

        $body = [
            'applicant_name' => 'রহিমা বেগম',
            'kind' => 'financial',
            'title' => 'চিকিৎসার জন্য আর্থিক সহায়তা',
            'client_uuid' => '33333333-3333-4333-8333-333333333333',
        ];

        $first = $this->postJson(self::GALACHIPA.'/api/assistances', $body)->assertCreated();
        $second = $this->postJson(self::GALACHIPA.'/api/assistances', $body)->assertSuccessful();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Assistance::where('client_uuid', $body['client_uuid'])->count());
    }

    public function test_suggestion_offline_replay_with_same_client_uuid_is_idempotent(): void
    {
        Sanctum::actingAs($this->citizen());

        $body = [
            'applicant_name' => 'শাহীন আলম',
            'kind' => 'bridge',
            'title' => 'খেয়াঘাটে সেতু প্রয়োজন',
            'description' => 'প্রতিদিন শিক্ষার্থীরা নৌকায় পার হয়।',
            'client_uuid' => '44444444-4444-4444-8444-444444444444',
        ];

        $first = $this->postJson(self::GALACHIPA.'/api/suggestions', $body)->assertCreated();
        $second = $this->postJson(self::GALACHIPA.'/api/suggestions', $body)->assertSuccessful();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Suggestion::where('client_uuid', $body['client_uuid'])->count());
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
        $id = Upazila::find('galachipa')
            ->run(fn () => Assistance::factory()->create()->id);

        Sanctum::actingAs(User::where('username', 'dc_patuakhali')->firstOrFail());

        $this->getJson(self::GALACHIPA.'/api/assistances')->assertOk();
        $this->postJson(self::GALACHIPA."/api/assistances/{$id}/approve")->assertStatus(403);
    }

    /**
     * The UNO's search box reaches every module at once and ranks by how many fields matched, so
     * a record whose name begins with the term beats one that merely mentions it.
     */
    public function test_unified_search_spans_modules_and_ranks_by_match(): void
    {
        Sanctum::actingAs($this->uno());

        Upazila::find('galachipa')->run(function () {
            Assistance::factory()->create([
                'applicant_name' => 'রহিমা বেগম', 'mobile' => '01777000111', 'title' => 'চিকিৎসা সহায়তা',
            ]);
            Complaint::factory()->create([
                'complainant_name' => 'করিম মিয়া', 'title' => 'রহিমা সড়কে পানি জমে থাকে',
            ]);
            Appointment::factory()->create([
                'applicant_name' => 'রহিমা খাতুন', 'mobile' => '01777000222', 'purpose' => 'ভূমি সংক্রান্ত',
            ]);
        });

        $results = $this->getJson(self::GALACHIPA.'/api/search?q=রহিমা')->assertOk()->json('results');

        $this->assertNotEmpty($results);

        // Records of someone actually named রহিমা outrank the complaint that merely mentions the
        // word in its title. Which of those name matches leads is not meaningful — they score the
        // same — so this asserts the boundary between them and the incidental mention.
        $named = collect($results)->firstWhere('label', 'মানবিক সহায়তা');
        $mentioned = collect($results)->firstWhere('label', 'অভিযোগ');

        $this->assertNotNull($named);
        $this->assertNotNull($mentioned);
        $this->assertGreaterThan($mentioned['score'], $named['score']);
        $this->assertNotSame('অভিযোগ', $results[0]['label'], 'a passing mention should never lead');

        // Appointment requests are in the same box.
        $labels = collect($results)->pluck('label');
        $this->assertContains('সাক্ষাৎকার', $labels, 'appointments should be searchable');

        $byPurpose = $this->getJson(self::GALACHIPA.'/api/search?q='.urlencode('ভূমি সংক্রান্ত'))->assertOk()->json('results');
        $this->assertSame('সাক্ষাৎকার', $byPurpose[0]['label']);

        // A mobile number finds its record too.
        $byPhone = $this->getJson(self::GALACHIPA.'/api/search?q=01777000111')->assertOk()->json('results');
        $this->assertSame('রহিমা বেগম', $byPhone[0]['name']);

        // One character is not a search.
        $this->getJson(self::GALACHIPA.'/api/search?q=র')->assertOk()->assertJsonPath('results', []);
    }

    /** Search must not become a way to put a name to a confidential suggestion. */
    public function test_search_never_reveals_a_confidential_author(): void
    {
        Upazila::find('galachipa')->run(fn () => Suggestion::factory()->create([
            'applicant_name' => 'অজ্ঞাতনামা তথ্যদাতা',
            'mobile' => '01999888777',
            'title' => 'গোপন প্রস্তাব',
            'is_confidential' => true,
        ]));

        Sanctum::actingAs($this->uno());

        // Findable by what it says…
        $this->assertNotEmpty($this->getJson(self::GALACHIPA.'/api/search?q='.urlencode('গোপন প্রস্তাব').'')->json('results'));

        // …but not by who said it, and the name never appears in a result.
        $this->assertEmpty($this->getJson(self::GALACHIPA.'/api/search?q=অজ্ঞাতনামা')->json('results'));
        $this->assertEmpty($this->getJson(self::GALACHIPA.'/api/search?q=01999888777')->json('results'));

        $names = collect($this->getJson(self::GALACHIPA.'/api/search?q='.urlencode('গোপন প্রস্তাব').'')->json('results'))->pluck('name');
        $this->assertNotContains('অজ্ঞাতনামা তথ্যদাতা', $names);
    }

    public function test_search_ignores_case_in_english_names(): void
    {
        $fwaId = User::where('username', 'fwa_galachipa')->value('id');
        Upazila::find('galachipa')->run(fn () => Pregnancy::factory()->create([
            'mother_name_bn' => 'রেহানা', 'mother_name_en' => 'Rehana Begum', 'created_by' => $fwaId,
        ]));

        Sanctum::actingAs(User::where('username', 'fwa_galachipa')->firstOrFail());

        // Postgres LIKE is case-sensitive, so the stored "Rehana" would only ever match that exact
        // spelling; the endpoints use ILIKE, so either casing must find her.
        foreach (['rehana', 'REHANA'] as $typed) {
            $this->assertNotEmpty($this->getJson(self::GALACHIPA."/api/search?q={$typed}")->json('results'));
        }
    }

    /**
     * Each role searches only what it can already open. Offering an FWA a complaint would hand
     * them a result that 403s on click, and show them a record they may not read on the way.
     */

    public function test_search_is_scoped_to_what_the_role_may_open(): void
    {
        // The mother is entered BY the FWA — an FWA only searches their own caseload
        // (RoleVisibilityScope).
        $fwaId = User::where('username', 'fwa_galachipa')->value('id');
        Upazila::find('galachipa')->run(function () use ($fwaId) {
            Pregnancy::factory()->create(['mother_name_bn' => 'শাপলা বেগম', 'created_by' => $fwaId]);
            Complaint::factory()->create(['complainant_name' => 'শাপলা বেগম']);
            Assistance::factory()->create(['applicant_name' => 'শাপলা বেগম']);
        });

        $labels = function (string $username): array {
            Sanctum::actingAs(User::where('username', $username)->firstOrFail());

            return collect($this->getJson(self::GALACHIPA.'/api/search?q='.urlencode('শাপলা'))->assertOk()->json('results'))
                ->pluck('label')->unique()->sort()->values()->all();
        };

        // An FWA sees mothers and nothing else.
        $this->assertSame(['মায়ের নাম'], $labels('fwa_galachipa'));

        // The UNO sees the same person across every module.
        $uno = $labels('uno_galachipa');
        $this->assertContains('মায়ের নাম', $uno);
        $this->assertContains('অভিযোগ', $uno);
        $this->assertContains('মানবিক সহায়তা', $uno);
    }
}
