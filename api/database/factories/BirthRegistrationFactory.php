<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BirthRegStatus;
use App\Models\BirthRegistration;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BirthRegistration>
 */
class BirthRegistrationFactory extends Factory
{
    protected $model = BirthRegistration::class;

    private const CHILDREN = ['আয়াত', 'জারা', 'রায়ান', 'মায়া', 'আরিয়ান', 'নুসাইবা', 'ইয়াসিন', 'সাফা'];
    private const MOTHERS = ['রিশা আক্তার', 'সুমাইয়া খাতুন', 'নুসরাত জাহান', 'মারিয়া বেগম', 'ফারজানা আক্তার'];
    private const FATHERS = ['রিয়াদ হাসান', 'সাকিব আহমেদ', 'জাহিদ হোসেন', 'কামাল উদ্দিন'];

    public function definition(): array
    {
        return [
            'status' => BirthRegStatus::PENDING_ENTRY->value,
            'child_name' => $this->faker->randomElement(self::CHILDREN),
            'mother_name' => $this->faker->randomElement(self::MOTHERS),
            'father_name' => $this->faker->randomElement(self::FATHERS),
            'ward_no' => $this->faker->numberBetween(1, 9),
            'date_of_birth' => $this->faker->dateTimeBetween('-2 months', 'now')->format('Y-m-d'),
            'sex' => $this->faker->randomElement(['male', 'female']),
        ];
    }

    /** An entered record — carries a BDRIS registration number. */
    public function entered(): static
    {
        return $this->state(fn () => [
            'status' => BirthRegStatus::ENTERED->value,
            'registration_no' => (string) $this->faker->numberBetween(10000000000000000, 99999999999999999),
            'bdris_reference' => 'BDRIS-'.strtoupper($this->faker->bothify('####??')),
            'bdris_submitted_at' => now(),
        ]);
    }
}
