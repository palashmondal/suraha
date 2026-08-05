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

        // Public-awareness posters from the upazila administration (§8.5). Images live in
        // storage/app/public/sliders and are served via the storage symlink.
        $slides = [
            ['ডেঙ্গু প্রতিরোধে সচেতন হোন', 'sliders/dengue.svg'],
            ['শিশুর টিকা সময়মতো দিন', 'sliders/vaccine.svg'],
            ['বাল্যবিবাহকে না বলুন', 'sliders/child-marriage.svg'],
            ['নিরাপদ মাতৃত্ব নিশ্চিত করুন', 'sliders/safe-motherhood.svg'],
        ];
        foreach ($slides as $i => [$title, $path]) {
            Slider::create([
                'title' => $title,
                'image_path' => $path,
                'link' => 'https://dcpatuakhali.gov.bd',
                'slide_date' => now()->subDays(count($slides) - $i)->toDateString(),
                'is_active' => true,
                'sort_order' => $i,
            ]);
        }

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
