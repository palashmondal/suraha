<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample সাক্ষাৎকার data across statuses in Golachipa.
 */
class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $golachipa = Upazila::find('golachipa');
        if (! $golachipa) {
            return;
        }

        tenancy()->initialize($golachipa);

        Appointment::factory()->count(5)->create();              // অপেক্ষমান
        Appointment::factory()->count(4)->approved()->create();  // অনুমোদিত
        Appointment::factory()->count(2)->rejected()->create();  // নাকচ

        tenancy()->end();
    }
}
