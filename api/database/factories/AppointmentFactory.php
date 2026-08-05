<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    private const NAMES = ['রিমন মিয়া', 'সুজন', 'আরিফুল ইসলাম', 'মোশারফ', 'তাহমিদ', 'সোহেল'];
    private const PURPOSES = [
        'ভূমি সংক্রান্ত সমস্যা',
        'নাগরিক সনদের আবেদন',
        'রাস্তা মেরামতের অনুরোধ',
        'শিক্ষা প্রতিষ্ঠান সংক্রান্ত',
        'ব্যক্তিগত সাক্ষাৎ',
    ];

    public function definition(): array
    {
        return [
            'status' => AppointmentStatus::PENDING->value,
            'applicant_name' => $this->faker->randomElement(self::NAMES),
            'ward_no' => $this->faker->numberBetween(1, 9),
            'address' => 'গলাচিপা সদর, ওয়ার্ড '.$this->faker->numberBetween(1, 9),
            'mobile' => '01'.$this->faker->numberBetween(3, 9).$this->faker->numerify('########'),
            'purpose' => $this->faker->randomElement(self::PURPOSES),
            'description' => 'সম্মানিত ইউএনও মহোদয়ের সাথে সাক্ষাৎ করে বিষয়টি বিস্তারিত আলোচনা করতে চাই।',
            'appointment_date' => $this->faker->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
            'appointment_time' => $this->faker->time('H:i'),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => AppointmentStatus::APPROVED->value, 'decided_at' => now()]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => ['status' => AppointmentStatus::REJECTED->value, 'decided_at' => now()]);
    }
}
