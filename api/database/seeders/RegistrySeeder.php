<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

// District + upazila (tenant) registry. Subdomains match the frontend switcher so a local
// X-Suraha-Tenant of "golachipa" resolves to গলাচিপা উপজেলা, বরিশাল.
class RegistrySeeder extends Seeder
{
    public function run(): void
    {
        $districts = [
            ['code' => 'barisal', 'name' => 'বরিশাল', 'name_en' => 'Barisal', 'upazilas' => [
                ['subdomain' => 'golachipa', 'name' => 'গলাচিপা উপজেলা', 'name_en' => 'Golachipa'],
            ]],
            ['code' => 'khulna', 'name' => 'খুলনা', 'name_en' => 'Khulna', 'upazilas' => [
                ['subdomain' => 'dumuria', 'name' => 'দুমুরিয়া উপজেলা', 'name_en' => 'Dumuria'],
            ]],
            ['code' => 'kushtia', 'name' => 'কুষ্টিয়া', 'name_en' => 'Kushtia', 'upazilas' => [
                ['subdomain' => 'mirpur', 'name' => 'মিরপুর উপজেলা', 'name_en' => 'Mirpur'],
            ]],
        ];

        foreach ($districts as $d) {
            $district = District::updateOrCreate(
                ['code' => $d['code']],
                ['name' => $d['name'], 'name_en' => $d['name_en']],
            );

            foreach ($d['upazilas'] as $u) {
                Upazila::updateOrCreate(
                    ['subdomain' => $u['subdomain']],
                    [
                        'district_id' => $district->id,
                        'name' => $u['name'],
                        'name_en' => $u['name_en'],
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
