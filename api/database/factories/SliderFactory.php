<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Slider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Slider>
 */
class SliderFactory extends Factory
{
    protected $model = Slider::class;

    private const TITLES = [
        'ডেঙ্গু প্রতিরোধে সচেতন হোন',
        'শিশুর টিকা সময়মতো দিন',
        'বাল্যবিবাহ প্রতিরোধ করুন',
        'নিরাপদ মাতৃত্ব নিশ্চিত করুন',
    ];

    public function definition(): array
    {
        return [
            'title' => $this->faker->randomElement(self::TITLES),
            'link' => 'https://example.gov.bd',
            'slide_date' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function stopped(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
