<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Suggestion;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample নাগরিক পরামর্শ for every upazila, across all three statuses so the নতুন / গৃহীত / নথিজাত
 * tabs are populated. The factory marks roughly a fifth গোপনীয়, which is what exercises the
 * identity-hiding on the listing.
 */
class SuggestionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Upazila::all() as $upazila) {
            tenancy()->initialize($upazila);

            Suggestion::factory()->count(6)->create();              // নতুন
            Suggestion::factory()->count(4)->accepted()->create();  // গৃহীত
            Suggestion::factory()->count(2)->rejected()->create();  // নথিজাত

            tenancy()->end();
        }
    }
}
