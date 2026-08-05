<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ComplaintStatus;
use App\Models\Complaint;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Complaint>
 */
class ComplaintFactory extends Factory
{
    protected $model = Complaint::class;

    private const NAMES = ['রিমন মিয়া', 'সুজন', 'আরিফুল ইসলাম', 'মোশারফ', 'তাহমিদ', 'সোহেল', 'নাসির', 'ফাহিম'];
    private const TITLES = [
        'খেয়াঘাটে বিশৃংখল ভাবে গাড়ি পার্কিং',
        'স্কুলের মাঠে অবৈধ নির্মাণ কার্যক্রম',
        'নদীর পাড়ে অবৈধভাবে মাটি কাটার অভিযোগ',
        'বাজারে প্লাস্টিকের অতিরিক্ত ব্যবহার',
        'শহরের আবর্জনা অপসারণে দেরি',
        'পুলিশের গাড়ির আগুন লাগার ঘটনা',
    ];
    private const PLACES = ['আমখোলা বাজার সুইস গেট', 'হরিদেবপুর খেয়াঘাট', 'সকালের বাজারের পাশে', 'শহীদ মিনার এলাকা'];

    public function definition(): array
    {
        return [
            'status' => ComplaintStatus::FILED->value,
            'complainant_name' => $this->faker->randomElement(self::NAMES),
            'ward_no' => $this->faker->numberBetween(1, 9),
            'address' => $this->faker->randomElement(self::PLACES).' থেকে ১ কি:মি উত্তরে।',
            'latitude' => $this->faker->latitude(22.0, 23.9),
            'longitude' => $this->faker->longitude(90.0, 90.9),
            'mobile' => '01'.$this->faker->numberBetween(3, 9).$this->faker->numerify('########'),
            'title' => $this->faker->randomElement(self::TITLES),
            'complaint_date' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
            'complaint_time' => $this->faker->time('H:i'),
            'description' => 'জনাব, বিনীত নিবেদন এই যে, আমাদের এলাকায় এই সমস্যাটি দীর্ঘদিন ধরে চলছে। দ্রুত ব্যবস্থা গ্রহণের জন্য অনুরোধ করছি।',
        ];
    }

    public function scheduled(): static
    {
        return $this->state(fn () => [
            'status' => ComplaintStatus::SCHEDULED->value,
            'schedule_date' => $this->faker->dateTimeBetween('now', '+1 week')->format('Y-m-d'),
            'scheduled_at' => now(),
        ]);
    }

    public function assigned(): static
    {
        return $this->scheduled()->state(fn () => [
            'status' => ComplaintStatus::ASSIGNED->value,
            'assigned_at' => now(),
        ]);
    }

    public function resolved(): static
    {
        return $this->assigned()->state(fn () => [
            'status' => ComplaintStatus::RESOLVED->value,
            'findings' => 'তদন্তে অভিযোগের সত্যতা পাওয়া গেছে এবং প্রয়োজনীয় ব্যবস্থা নেওয়া হয়েছে।',
            'resolved_at' => now(),
        ]);
    }
}
