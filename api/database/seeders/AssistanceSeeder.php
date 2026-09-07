<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Assistance;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample মানবিক সহায়তা applications for every upazila, spread across all three statuses so the
 * অপেক্ষমান / অনুমোদিত / নাকচ tabs and the গুরুত্বপূর্ণ filter all have rows. Amounts and decision
 * notes come from the factory states, which is what the detail page renders.
 */
class AssistanceSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Upazila::all() as $upazila) {
            tenancy()->initialize($upazila);

            Assistance::factory()->count(6)->create();              // অপেক্ষমান
            Assistance::factory()->count(4)->approved()->create();  // অনুমোদিত
            Assistance::factory()->count(2)->rejected()->create();  // নাকচ

            tenancy()->end();
        }
    }
}
