<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Complaint;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample অভিযোগ data across the lifecycle for every upazila, so the tabs, the timeline, the
 * শুনানি ক্যালেন্ডার and the investigator dashboard all have real rows. Assigned and resolved
 * complaints are attributed to that upazila's own investigating officer.
 */
class ComplaintSeeder extends Seeder
{
    /**
     * শুনানি ক্যালেন্ডার — days from today. Two share a day so the calendar has something to
     * group. No note per slot: the detail page composes the শুনানি sentence from the event meta,
     * so a stored comment would only repeat it.
     */
    private const HEARING_SLOTS = [2, 3, 3, 6, 9, 13];

    /** বাতিল — the UNO's reason at review, which is what the timeline shows. */
    private const REJECTION_REASONS = [
        'অভিযোগটি এই দপ্তরের এখতিয়ারবহির্ভূত। বিষয়টি সংশ্লিষ্ট আদালতে বিচারাধীন।',
        'একই বিষয়ে পূর্বেও অভিযোগ দাখিল ও নিষ্পত্তি হয়েছে; নতুন কোনো তথ্য পাওয়া যায়নি।',
        'অভিযোগের সমর্থনে প্রয়োজনীয় কাগজপত্র ও সাক্ষ্যপ্রমাণ দাখিল করা হয়নি।',
    ];

    public function run(): void
    {
        foreach (Upazila::all() as $upazila) {
            tenancy()->initialize($upazila);

            $investigator = User::where('role', Role::INVESTIGATING_OFFICER)->first();
            $withOfficer = fn () => ['investigating_officer_id' => $investigator?->id];

            $pending = Complaint::factory()->count(5)->create();                                    // অপেক্ষমাণ
            $assigned = Complaint::factory()->count(3)->assigned()->state($withOfficer)->create();   // তদন্ত কর্মকর্তা নিযুক্ত
            $completed = Complaint::factory()->count(2)->completed()->state($withOfficer)->create(); // সম্পন্ন

            $rejected = Complaint::factory()->count(count(self::REJECTION_REASONS))->rejected()->create(); // বাতিল

            // Assigned, report still owed, and the due date already gone — what the detail page's
            // "প্রতিবেদন পাওয়া যায় নাই" warning is for.
            $overdue = Complaint::factory()->count(2)->assigned()->state($withOfficer)->create();
            foreach ($overdue as $i => $c) {
                $c->update(['due_date' => now()->subDays(3 + $i * 5)->toDateString()]);
            }

            // শুনানি নির্ধারিত — still assigned, but with a date set, which is what the calendar
            // and the তালিকা tab both read.
            $hearings = Complaint::factory()
                ->count(count(self::HEARING_SLOTS))
                ->assigned()
                ->state($withOfficer)
                ->create();

            foreach ($hearings as $i => $c) {
                $c->update(['hearing_date' => now()->addDays(self::HEARING_SLOTS[$i])->toDateString()]);
            }

            // A baseline timeline so the detail page + tabs look real.
            $all = $pending->concat($assigned)->concat($completed)->concat($hearings)
                ->concat($rejected)->concat($overdue);

            foreach ($all as $c) {
                $c->events()->create(['type' => 'filed']);
            }

            foreach ($assigned->concat($completed)->concat($hearings)->concat($overdue) as $c) {
                // No prose comment: the detail page composes the appointment sentence from meta.
                $c->events()->create([
                    'type' => 'accepted',
                    'actor_role' => 'uno',
                    'meta' => [
                        'officer_id' => $investigator?->id,
                        'officer_name' => $investigator?->name,
                        'officer_designation' => $investigator?->designation,
                        'due_date' => $c->due_date?->toDateString(),
                    ],
                ]);
            }

            foreach ($hearings as $c) {
                // A hearing follows a report — the API refuses to schedule one without it, so the
                // seeded timeline must show the same order.
                $c->events()->create([
                    'type' => 'report',
                    'actor_role' => 'investigating_officer',
                    'comment' => 'সরেজমিন তদন্ত সম্পন্ন করে প্রতিবেদন দাখিল করা হলো।',
                ]);
                $c->events()->create([
                    'type' => 'hearing_scheduled',
                    'actor_role' => 'uno',
                    'meta' => ['hearing_date' => $c->hearing_date?->toDateString()],
                ]);
            }

            foreach ($rejected as $i => $c) {
                $c->events()->create([
                    'type' => 'rejected',
                    'actor_role' => 'uno',
                    'comment' => self::REJECTION_REASONS[$i],
                ]);
            }

            foreach ($completed as $c) {
                $c->events()->create(['type' => 'completed', 'actor_role' => 'uno', 'comment' => 'তদন্ত শেষে নিষ্পত্তি করা হলো।']);
            }

            tenancy()->end();
        }
    }
}
