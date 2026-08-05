<?php

namespace Database\Seeders;

use App\Models\Complaint;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample অভিযোগ data across the lifecycle so the tabs, timeline, and investigator dashboard have
 * real rows. Assigned/resolved complaints are attributed to the seeded investigating officer.
 */
class ComplaintSeeder extends Seeder
{
    public function run(): void
    {
        $golachipa = Upazila::find('golachipa');
        if (! $golachipa) {
            return;
        }

        tenancy()->initialize($golachipa);

        $investigatorId = User::where('username', 'tdonto_golachipa')->value('id');
        $withOfficer = fn () => ['investigating_officer_id' => $investigatorId];

        Complaint::factory()->count(4)->create();                                  // নিষ্পত্তিহীন
        Complaint::factory()->count(3)->scheduled()->create();                     // শিডিউল যুক্ত
        Complaint::factory()->count(3)->assigned()->state($withOfficer)->create(); // তদন্তকারী যুক্ত
        Complaint::factory()->count(2)->resolved()->state($withOfficer)->create(); // নিষ্পত্তি সম্পন্ন

        tenancy()->end();
    }
}
