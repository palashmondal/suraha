<?php

namespace Database\Seeders;

use App\Enums\DeliveryStatus;
use App\Models\BirthRegistration;
use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Services\Bdris\BirthRegistrationService;
use Illuminate\Database\Seeder;

/**
 * Sample জন্ম নিবন্ধন data. Runs the real service on a few delivered pregnancies so entered
 * records carry a BDRIS number + a downloadable certificate, plus a couple of pending manual
 * entries to populate the "কার্যকর কিন্তু এন্ট্রি হয়নি" tab.
 */
class BirthRegistrationSeeder extends Seeder
{
    public function run(): void
    {
        $galachipa = Upazila::find('galachipa');
        if (! $galachipa) {
            return;
        }

        tenancy()->initialize($galachipa);

        // Approve 3 delivered pregnancies → BDRIS entered + certificate.
        $service = app(BirthRegistrationService::class);
        Pregnancy::where('delivery_status', DeliveryStatus::DELIVERED->value)
            ->take(3)->get()
            ->each(fn (Pregnancy $p) => $service->approveFromPregnancy($p, ['child_name' => 'নবজাতক']));

        // A couple of manual entries still awaiting BDRIS entry.
        $unionId = Union::value('id');
        BirthRegistration::factory()->count(2)->create(['union_id' => $unionId]);

        tenancy()->end();
    }
}
