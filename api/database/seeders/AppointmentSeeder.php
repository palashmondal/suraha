<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample সাক্ষাৎকার data across statuses in Galachipa.
 */
class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $galachipa = Upazila::find('galachipa');
        if (! $galachipa) {
            return;
        }

        tenancy()->initialize($galachipa);

        Appointment::factory()->count(5)->create();              // অপেক্ষমান
        Appointment::factory()->count(4)->approved()->create();  // অনুমোদিত
        Appointment::factory()->count(2)->rejected()->create();  // নাকচ

        tenancy()->end();
    }
}
