<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GeneralInfo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GeneralInfo>
 */
class GeneralInfoFactory extends Factory
{
    protected $model = GeneralInfo::class;

    public function definition(): array
    {
        return [
            'type' => 'phone',
            'title' => 'থানা',
            'value' => '01700000000',
            'sort_order' => 0,
        ];
    }

    public function phone(string $title, string $number): static
    {
        return $this->state(fn () => ['type' => 'phone', 'title' => $title, 'value' => $number]);
    }

    public function about(string $title, string $body): static
    {
        return $this->state(fn () => ['type' => 'about', 'title' => $title, 'value' => $body]);
    }
}
