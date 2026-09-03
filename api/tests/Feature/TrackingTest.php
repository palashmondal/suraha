<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Public tracking tokens (§7): filing yields a token; anyone with the token can look up status
 * without logging in; tokens are tenant-scoped; bad tokens 404.
 */
class TrackingTest extends TestCase
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

    public function test_filing_a_complaint_returns_a_token_and_it_tracks(): void
    {
        Sanctum::actingAs($this->citizen());
        $token = $this->postJson(self::GALACHIPA.'/api/complaints', [
            'title' => 'রাস্তার সমস্যা', 'complainant_name' => 'করিম', 'ward_no' => 2,
        ])->assertCreated()->json('data.tracking_token');

        $this->assertNotEmpty($token);
        $this->assertStringStartsWith('SUR-CMP-', $token);

        // Public lookup — no auth.
        $this->getJson(self::GALACHIPA."/api/track/{$token}")
            ->assertOk()
            ->assertJsonPath('type', 'complaint')
            ->assertJsonPath('title', 'রাস্তার সমস্যা')
            ->assertJsonPath('status', 'pending')
            ->assertJsonCount(3, 'timeline');
    }

    public function test_filing_an_appointment_returns_a_token_and_it_tracks(): void
    {
        Sanctum::actingAs($this->citizen());
        $token = $this->postJson(self::GALACHIPA.'/api/appointments', [
            'applicant_name' => 'করিম', 'purpose' => 'ভূমি সমস্যা',
        ])->assertCreated()->json('data.tracking_token');

        $this->assertStringStartsWith('SUR-APT-', $token);
        $this->getJson(self::GALACHIPA."/api/track/{$token}")
            ->assertOk()->assertJsonPath('type', 'appointment')->assertJsonPath('status', 'pending');
    }

    public function test_unknown_token_is_404(): void
    {
        $this->getJson(self::GALACHIPA.'/api/track/SUR-CMP-NOPE99')->assertNotFound();
    }

    public function test_token_is_tenant_scoped(): void
    {
        Sanctum::actingAs($this->citizen());
        $token = $this->postJson(self::GALACHIPA.'/api/complaints', [
            'title' => 'x', 'complainant_name' => 'y',
        ])->json('data.tracking_token');

        // Same token on a different upazila's subdomain must not resolve.
        $this->getJson(self::DUMURIA."/api/track/{$token}")->assertNotFound();
    }
}
