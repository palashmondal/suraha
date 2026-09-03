<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\DeliveryStatus;
use App\Models\Pregnancy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pregnancy>
 */
class PregnancyFactory extends Factory
{
    protected $model = Pregnancy::class;

    private const MOTHERS_BN = ['রিশা আক্তার', 'সুমাইয়া খাতুন', 'নুসরাত জাহান', 'মারিয়া বেগম', 'ফারজানা আক্তার', 'তানিয়া সুলতানা', 'শারমিন আক্তার', 'রুবিনা খাতুন', 'জেসমিন আরা', 'সাদিয়া ইসলাম', 'আয়েশা সিদ্দিকা', 'হালিমা খাতুন'];
    private const MOTHERS_EN = ['Risha Akter', 'Sumaiya Khatun', 'Nusrat Jahan', 'Maria Begum', 'Farzana Akter', 'Tania Sultana', 'Sharmin Akter', 'Rubina Khatun', 'Jesmin Ara', 'Sadia Islam', 'Ayesha Siddika', 'Halima Khatun'];
    private const HUSBANDS = ['রিয়াদ হাসান', 'সাকিব আহমেদ', 'জাহিদ হোসেন', 'কামাল উদ্দিন', 'রফিকুল ইসলাম', 'মিজানুর রহমান', 'শাহীন আলম', 'নাসির উদ্দিন'];
    private const PLACES = ['উপজেলা স্বাস্থ্য কমপ্লেক্স', 'ইউনিয়ন স্বাস্থ্য কেন্দ্র', 'বাড়িতে', 'ক্লিনিকে'];
    private const DISEASES = ['ডায়াবেটিস', 'উচ্চ রক্তচাপ', 'হাঁপানি', 'থাইরয়েড'];

    public function definition(): array
    {
        $i = $this->faker->numberBetween(0, 11);

        return [
            'delivery_status' => DeliveryStatus::NOT_DELIVERED->value,
            'ward_no' => $this->faker->numberBetween(1, 9),

            // General
            'mother_name_bn' => self::MOTHERS_BN[$i],
            'mother_name_en' => self::MOTHERS_EN[$i],
            'husband_name' => $this->faker->randomElement(self::HUSBANDS),
            'register_no' => (string) $this->faker->numberBetween(1200000, 1299999),
            'which_child' => $this->faker->numberBetween(1, 4),
            'height_inch' => $this->faker->numberBetween(56, 66),
            'weight_kg' => $this->faker->numberBetween(45, 70),
            'current_age' => $this->faker->numberBetween(19, 38),
            'marriage_age' => $this->faker->numberBetween(16, 25),
            'blood_group' => $this->faker->randomElement(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
            'chronic_diseases' => $this->faker->boolean(30)
                ? $this->faker->randomElements(self::DISEASES, $this->faker->numberBetween(1, 2))
                : [],

            // Address & contact
            'address' => 'গলাচিপা সদর, ওয়ার্ড '.$this->faker->numberBetween(1, 9),
            'latitude' => $this->faker->latitude(22.0, 23.9),
            'longitude' => $this->faker->longitude(90.0, 90.9),
            'mobile' => '01'.$this->faker->numberBetween(3, 9).$this->faker->numerify('########'),

            // Health
            'tt_vaccine_count' => $this->faker->numberBetween(0, 5),
            'last_tt_date' => $this->faker->dateTimeBetween('-1 year', '-1 month')->format('Y-m-d'),
            'last_menstruation_date' => $this->faker->dateTimeBetween('-8 months', '-1 month')->format('Y-m-d'),
            'gravida_count' => $this->faker->numberBetween(1, 5),
            'prior_miscarriages' => $this->faker->numberBetween(0, 2),
            'last_child_age' => $this->faker->numberBetween(0, 10),
            'prior_normal_deliveries' => $this->faker->numberBetween(0, 3),
            'prior_cesarean_deliveries' => $this->faker->numberBetween(0, 2),
            'prior_delivery_place' => $this->faker->randomElement(self::PLACES),

            // Delivery plan
            'expected_delivery_date' => $this->faker->dateTimeBetween('now', '+3 months')->format('Y-m-d'),
            'delivery_place_plan' => $this->faker->randomElement(self::PLACES),
            'emergency_transport' => $this->faker->boolean(70),
            'enough_money' => $this->faker->boolean(60),
            'blood_donor_arranged' => $this->faker->boolean(50),
        ];
    }

    /** A record where delivery has been confirmed — fills the post-delivery fields. */
    public function delivered(): static
    {
        return $this->state(fn () => [
            'delivery_status' => DeliveryStatus::DELIVERED->value,
            'expected_delivery_date' => $this->faker->dateTimeBetween('-3 months', '-1 week')->format('Y-m-d'),
            'actual_delivery_date' => $this->faker->dateTimeBetween('-2 months', 'now')->format('Y-m-d'),
            'mother_alive' => true,
            'delivery_type' => $this->faker->randomElement(['normal', 'cesarean']),
            'delivery_place' => $this->faker->randomElement(self::PLACES),
            'newborn_count' => 1,
            'newborn_alive' => true,
            'baby_sex' => $this->faker->randomElement(['male', 'female']),
            'birth_weight_kg' => $this->faker->randomFloat(2, 2.4, 3.8),
            'birth_height_inch' => $this->faker->randomFloat(1, 17, 21),
            'birth_time' => $this->faker->time('H:i'),
        ]);
    }
}
