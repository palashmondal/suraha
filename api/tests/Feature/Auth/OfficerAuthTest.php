<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\District;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OfficerAuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUno(): User
    {
        $district = District::create(['name' => 'বরিশাল', 'code' => 'barisal']);
        $upazila = Upazila::create([
            'district_id' => $district->id,
            'name' => 'গলাচিপা উপজেলা',
            'subdomain' => 'golachipa',
        ]);

        return User::create([
            'name' => 'মহিউদ্দিন আল হেলাল',
            'role' => Role::Uno->value,
            'username' => 'uno',
            'designation' => 'উপজেলা নির্বাহী অফিসার',
            'password' => Hash::make('secret123'),
            'upazila_id' => $upazila->id,
            'is_active' => true,
        ]);
    }

    public function test_officer_logs_in_and_receives_token_and_session_user(): void
    {
        $this->makeUno();

        $res = $this->postJson('/api/auth/officer/login', [
            'username' => 'uno',
            'password' => 'secret123',
        ]);

        $res->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'role', 'name', 'designation', 'upazila', 'mobile']])
            ->assertJsonPath('user.role', 'uno')
            ->assertJsonPath('user.upazila', 'গলাচিপা উপজেলা, বরিশাল');

        $this->assertNotEmpty($res->json('token'));
    }

    public function test_officer_login_rejects_bad_password(): void
    {
        $this->makeUno();

        $this->postJson('/api/auth/officer/login', [
            'username' => 'uno',
            'password' => 'wrong',
        ])->assertStatus(422);
    }

    public function test_inactive_officer_cannot_log_in(): void
    {
        $uno = $this->makeUno();
        $uno->update(['is_active' => false]);

        $this->postJson('/api/auth/officer/login', [
            'username' => 'uno',
            'password' => 'secret123',
        ])->assertStatus(422);
    }

    public function test_citizen_cannot_use_officer_login(): void
    {
        User::create([
            'name' => 'নাগরিক',
            'role' => Role::Citizen->value,
            'username' => 'someone',
            'password' => Hash::make('secret123'),
            'is_active' => true,
        ]);

        $this->postJson('/api/auth/officer/login', [
            'username' => 'someone',
            'password' => 'secret123',
        ])->assertStatus(422);
    }

    public function test_me_and_logout_require_and_consume_token(): void
    {
        $uno = $this->makeUno();
        $token = $uno->createToken('pwa')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'uno');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertCount(0, $uno->fresh()->tokens);
    }
}
