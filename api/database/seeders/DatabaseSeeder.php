<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\District;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Minimal dev seed (per the M2 decision): two real upazilas in one district, a few unions
 * each, one officer per role, a DC, a SEAL admin, and a sample citizen. Enough to exercise
 * tenancy, the upazila switcher, RBAC, and both login flows.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // All 64 districts first, so the instance-admin district dropdown is fully populated.
        $this->call(DistrictSeeder::class);
        $barishal = District::where('name', 'Barishal')->firstOrFail();

        $golachipa = $this->upazila('golachipa', 'Golachipa', 'গলাচিপা', $barishal->id, [
            ['Golachipa Sadar', 'গলাচিপা সদর', 'union', 9],
            ['Panpatty', 'পানপট্টি', 'union', 9],
            ['Golachipa Pourashava', 'গলাচিপা পৌরসভা', 'pourashava', 9],
        ]);

        $dumuria = $this->upazila('dumuria', 'Dumuria', 'ডুমুরিয়া', $barishal->id, [
            ['Dumuria Sadar', 'ডুমুরিয়া সদর', 'union', 9],
            ['Rudaghara', 'রুদাঘরা', 'union', 9],
        ]);

        // ---- Cross-tenant officers -----------------------------------
        $this->officer('admin', 'সুরাহা অ্যাডমিন', Role::SEAL_ADMIN, tenantId: null);
        $this->officer('dc_barishal', 'জেলা প্রশাসক, বরিশাল', Role::DC, tenantId: null, districtId: $barishal->id);

        // ---- Golachipa officers (one per tenant-bound role) ----------
        $sadar = Union::where('tenant_id', $golachipa->id)->where('name', 'Golachipa Sadar')->first();
        $this->officer('uno_golachipa', 'ইউএনও, গলাচিপা', Role::UNO, tenantId: $golachipa->id, designation: 'উপজেলা নির্বাহী কর্মকর্তা');
        $this->officer('sochib_golachipa', 'ইউপি সচিব, গলাচিপা সদর', Role::UP_SOCHIB, tenantId: $golachipa->id, unionId: $sadar?->id, designation: 'ইউপি সচিব');
        $this->officer('fwa_golachipa', 'পরিবার কল্যাণ সহকারী', Role::FWA, tenantId: $golachipa->id, unionId: $sadar?->id, wardNo: 3, designation: 'পরিবার কল্যাণ সহকারী');
        $this->officer('tdonto_golachipa', 'তদন্ত কর্মকর্তা', Role::INVESTIGATING_OFFICER, tenantId: $golachipa->id, designation: 'তদন্ত কর্মকর্তা');

        // ---- Sample citizen in Golachipa -----------------------------
        User::create([
            'name' => 'নাগরিক (নমুনা)',
            'phone' => '01700000000',
            'role' => Role::CITIZEN->value,
            'tenant_id' => $golachipa->id,
            'phone_verified_at' => now(),
            'is_active' => true,
        ]);

        // ---- Module sample data --------------------------------------
        $this->call(PregnancySeeder::class);
        $this->call(BirthRegistrationSeeder::class);
        $this->call(ComplaintSeeder::class);
        $this->call(AppointmentSeeder::class);
        $this->call(PublicContentSeeder::class);
        $this->call(NotificationSeeder::class);
    }

    private function upazila(string $id, string $name, string $nameBn, int $districtId, array $unions): Upazila
    {
        $upazila = Upazila::create([
            'id' => $id,
            'name' => $name,
            'name_bn' => $nameBn,
            'district_id' => $districtId,
        ]);

        $upazila->domains()->create(['domain' => $id]);

        foreach ($unions as [$un, $unBn, $type, $wards]) {
            Union::create([
                'tenant_id' => $upazila->id,
                'name' => $un,
                'name_bn' => $unBn,
                'type' => $type,
                'ward_count' => $wards,
            ]);
        }

        return $upazila;
    }

    private function officer(
        string $username,
        string $name,
        Role $role,
        ?string $tenantId,
        ?int $districtId = null,
        ?int $unionId = null,
        ?int $wardNo = null,
        ?string $designation = null,
    ): void {
        User::create([
            'name' => $name,
            'username' => $username,
            'password' => Hash::make('password'),
            'role' => $role->value,
            'tenant_id' => $tenantId,
            'district_id' => $districtId,
            'union_id' => $unionId,
            'ward_no' => $wardNo,
            'designation' => $designation,
            'is_active' => true,
        ]);
    }
}
