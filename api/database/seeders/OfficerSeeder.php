<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\District;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

// Demo officer accounts (one per role) + a demo citizen, so every role's login works out of the box.
// Officers log in with username/password; the citizen with mobile + OTP (dev bypass code). Passwords
// here are for local/dev only — real accounts are provisioned via the officer-management area (§8.6).
class OfficerSeeder extends Seeder
{
    public function run(): void
    {
        $golachipa = Upazila::where('subdomain', 'golachipa')->first();
        $barisal = District::where('code', 'barisal')->first();
        $password = Hash::make('password');

        $officers = [
            ['username' => 'fwa', 'role' => Role::Fwa, 'name' => 'রেহানা পারভীন', 'upazila_id' => $golachipa?->id],
            ['username' => 'sochib', 'role' => Role::Sochib, 'name' => 'আব্দুল করিম', 'upazila_id' => $golachipa?->id],
            ['username' => 'uno', 'role' => Role::Uno, 'name' => 'মহিউদ্দিন আল হেলাল', 'designation' => 'উপজেলা নির্বাহী অফিসার, গলাচিপা', 'upazila_id' => $golachipa?->id],
            ['username' => 'investigator', 'role' => Role::Investigator, 'name' => 'সাইফুল ইসলাম', 'upazila_id' => $golachipa?->id],
            ['username' => 'dc', 'role' => Role::Dc, 'name' => 'ফারহানা আক্তার', 'designation' => 'জেলা প্রশাসক, বরিশাল', 'district_id' => $barisal?->id],
            ['username' => 'seal', 'role' => Role::Seal, 'name' => 'সুরাহা অ্যাডমিন'],
        ];

        foreach ($officers as $o) {
            User::updateOrCreate(
                ['username' => $o['username']],
                [
                    'name' => $o['name'],
                    'role' => $o['role']->value,
                    'designation' => $o['designation'] ?? $o['role']->label(),
                    'password' => $password,
                    'upazila_id' => $o['upazila_id'] ?? null,
                    'district_id' => $o['district_id'] ?? null,
                    'is_active' => true,
                ],
            );
        }

        // Demo citizen of Golachipa (log in with this mobile + the OTP bypass code in dev).
        User::updateOrCreate(
            ['mobile' => '01700000000', 'role' => Role::Citizen->value],
            [
                'name' => 'আবিদুর রহমান',
                'designation' => Role::Citizen->label(),
                'upazila_id' => $golachipa?->id,
                'is_active' => true,
            ],
        );
    }
}
