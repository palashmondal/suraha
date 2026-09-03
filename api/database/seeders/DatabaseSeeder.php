<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Http\Controllers\Admin\UpazilaController;
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
        $this->call(DivisionSeeder::class);
        $this->call(DistrictSeeder::class);
        $this->call(UpazilaRefSeeder::class);
        $this->call(UnionRefSeeder::class);
        // Real districts, per the national portal: Galachipa is in Patuakhali (Barishal division),
        // Dumuria in Khulna. They sit in different districts on purpose — that is what makes the
        // DC's district scope testable.
        $patuakhali = District::where('name', 'Patuakhali')->firstOrFail();
        $khulna = District::where('name', 'Khulna')->firstOrFail();

        // Unions come from the national catalogue, not a hand-written pair: they are what an FWA
        // is posted to and what every record is filed under, so demo data with three of Galachipa's
        // twelve made the union dropdowns wrong everywhere they appear.
        $galachipa = $this->upazila('galachipa', 'Galachipa', 'গলাচিপা', $patuakhali->id);
        $dumuria = $this->upazila('dumuria', 'Dumuria', 'ডুমুরিয়া', $khulna->id);

        // ---- Cross-tenant officers -----------------------------------
        $this->officer('admin', 'সুরাহা অ্যাডমিন', Role::SEAL_ADMIN, tenantId: null);
        $this->officer('dc_patuakhali', 'জেলা প্রশাসক, পটুয়াখালী', Role::DC, tenantId: null, districtId: $patuakhali->id);
        $this->officer('dc_khulna', 'জেলা প্রশাসক, খুলনা', Role::DC, tenantId: null, districtId: $khulna->id);

        // ---- Galachipa officers (one per tenant-bound role) ----------
        $sadar = Union::where('tenant_id', $galachipa->id)->where('name', 'Galachipa')->first();
        $this->officer('uno_galachipa', 'ইউএনও, গলাচিপা', Role::UNO, tenantId: $galachipa->id, designation: 'উপজেলা নির্বাহী কর্মকর্তা');
        $this->officer('sochib_galachipa', 'ইউপি সচিব, গলাচিপা', Role::UP_SOCHIB, tenantId: $galachipa->id, unionId: $sadar?->id, designation: 'ইউপি সচিব');
        $this->officer('fwa_galachipa', 'পরিবার কল্যাণ সহকারী', Role::FWA, tenantId: $galachipa->id, unionId: $sadar?->id, wardNo: 3, designation: 'পরিবার কল্যাণ সহকারী');
        $this->officer('tdonto_galachipa', 'তদন্ত কর্মকর্তা', Role::INVESTIGATING_OFFICER, tenantId: $galachipa->id, designation: 'তদন্ত কর্মকর্তা');

        // ---- Sample citizen in Galachipa -----------------------------
        User::create([
            'name' => 'নাগরিক (নমুনা)',
            'phone' => '01700000000',
            'role' => Role::CITIZEN->value,
            'tenant_id' => $galachipa->id,
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

        // Six months of history for the dashboard charts — demo dressing, not a fixture. Kept out
        // of tests, which assert exact counts against the small deterministic seed above.
        if (! app()->runningUnitTests()) {
            $this->call(ActivitySeeder::class);
        }
    }

    private function upazila(string $id, string $name, string $nameBn, int $districtId): Upazila
    {
        $upazila = Upazila::create([
            'id' => $id,
            'name' => $name,
            'name_bn' => $nameBn,
            'district_id' => $districtId,
        ]);

        $upazila->domains()->create(['domain' => $id]);

        app(UpazilaController::class)->seedUnions($upazila);

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
