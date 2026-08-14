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

        $pending = Complaint::factory()->count(5)->create();                                   // পর্যালোচনাধীন
        $assigned = Complaint::factory()->count(3)->assigned()->state($withOfficer)->create();  // তদন্ত কর্মকর্তা নিযুক্ত
        $completed = Complaint::factory()->count(2)->completed()->state($withOfficer)->create(); // সম্পন্ন

        // A baseline timeline so the detail page + tabs look real.
        foreach ($pending->concat($assigned)->concat($completed) as $c) {
            $c->events()->create(['type' => 'filed']);
        }
        foreach ($assigned->concat($completed) as $c) {
            $c->events()->create([
                'type' => 'accepted',
                'actor_role' => 'uno',
                'comment' => 'তদন্তের জন্য গ্রহণ করা হলো।',
                'meta' => ['officer_id' => $investigatorId, 'due_date' => $c->due_date?->toDateString()],
            ]);
        }
        foreach ($completed as $c) {
            $c->events()->create(['type' => 'completed', 'actor_role' => 'uno', 'comment' => 'তদন্ত শেষে নিষ্পত্তি করা হলো।']);
        }

        tenancy()->end();
    }
}
