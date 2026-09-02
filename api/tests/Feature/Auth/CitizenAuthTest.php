<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\District;
use App\Models\OtpCode;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class CitizenAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('otp:01711111111');
        // Fixed dev bypass code so the test can "receive" the OTP without a live SMS gateway.
        config(['suraha.otp.bypass_code' => '000000']);

        $district = District::create(['name' => 'বরিশাল', 'code' => 'barisal']);
        Upazila::create([
            'district_id' => $district->id,
            'name' => 'গলাচিপা উপজেলা',
            'subdomain' => 'golachipa',
        ]);
    }

    public function test_request_otp_stores_a_code(): void
    {
        $this->postJson('/api/auth/citizen/otp', ['mobile' => '01711111111'])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseCount('otp_codes', 1);
    }

    public function test_request_otp_validates_mobile_format(): void
    {
        $this->postJson('/api/auth/citizen/otp', ['mobile' => '12345'])
            ->assertStatus(422);
    }

    public function test_verify_creates_citizen_scoped_to_tenant_and_returns_token(): void
    {
        // The PWA names the tenant via header in local/dev; verify stamps the resolved upazila.
        $res = $this->withHeader('X-Suraha-Tenant', 'golachipa')
            ->postJson('/api/auth/citizen/verify', ['mobile' => '01711111111', 'code' => '000000']);

        $res->assertOk()
            ->assertJsonPath('user.role', 'citizen')
            ->assertJsonPath('user.mobile', '01711111111')
            ->assertJsonPath('user.upazila', 'গলাচিপা উপজেলা, বরিশাল');

        $this->assertNotEmpty($res->json('token'));

        $citizen = User::where('mobile', '01711111111')->first();
        $this->assertSame(Role::Citizen, $citizen->role);
        $this->assertNotNull($citizen->upazila_id);
    }

    public function test_verify_rejects_wrong_code(): void
    {
        OtpCode::create([
            'mobile' => '01711111111',
            'code_hash' => Hash::make('654321'),
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/auth/citizen/verify', ['mobile' => '01711111111', 'code' => '111111'])
            ->assertStatus(422);
    }

    public function test_verify_is_idempotent_for_returning_citizen(): void
    {
        $this->withHeader('X-Suraha-Tenant', 'golachipa')
            ->postJson('/api/auth/citizen/verify', ['mobile' => '01711111111', 'code' => '000000'])
            ->assertOk();

        $this->withHeader('X-Suraha-Tenant', 'golachipa')
            ->postJson('/api/auth/citizen/verify', ['mobile' => '01711111111', 'code' => '000000'])
            ->assertOk();

        $this->assertSame(1, User::where('mobile', '01711111111')->count());
    }
}
