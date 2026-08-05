<?php

namespace Database\Seeders;

use App\Models\GeneralInfo;
use App\Models\Slider;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample sliders + general info for Golachipa so the landing page + dashboard have real content.
 */
class PublicContentSeeder extends Seeder
{
    public function run(): void
    {
        $golachipa = Upazila::find('golachipa');
        if (! $golachipa) {
            return;
        }

        tenancy()->initialize($golachipa);

        Slider::factory()->count(3)->create();
        Slider::factory()->stopped()->create();

        foreach ([
            ['থানা (গলাচিপা)', '01320001234'],
            ['উপজেলা স্বাস্থ্য কমপ্লেক্স', '01700005678'],
            ['ফায়ার সার্ভিস', '01999009900'],
            ['উপজেলা নির্বাহী অফিস', '01710002020'],
        ] as [$title, $number]) {
            GeneralInfo::factory()->phone($title, $number)->create();
        }

        GeneralInfo::factory()->about(
            'গলাচিপা উপজেলা সম্পর্কে',
            'গলাচিপা বাংলাদেশের বরিশাল বিভাগের পটুয়াখালী জেলার একটি উপজেলা। এটি নদীবেষ্টিত একটি কৃষিপ্রধান অঞ্চল।',
        )->create();

        tenancy()->end();
    }
}
