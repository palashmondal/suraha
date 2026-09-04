<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ComplaintStatus;
use App\Enums\Role;
use App\Models\Complaint;
use App\Models\Union;
use App\Models\User;
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
    private const FATHER_NAMES = [
        'মৃত আব্দুল জলিল', 'হাজী মোঃ ইব্রাহিম', 'মোঃ সিরাজুল ইসলাম', 'মৃত নূর মোহাম্মদ',
        'আলহাজ্ব আবু বকর সিদ্দিক', 'মোঃ রফিকুল ইসলাম',
    ];
    private const PLACES = ['আমখোলা বাজার সুইস গেট', 'হরিদেবপুর খেয়াঘাট', 'সকালের বাজারের পাশে', 'শহীদ মিনার এলাকা'];

    public function definition(): array
    {
        return [
            'status' => ComplaintStatus::PENDING->value,
            'complainant_name' => $this->faker->randomElement(self::NAMES),
            'father_name' => $this->faker->randomElement(self::FATHER_NAMES),
            // Every অভিযোগ happens somewhere in the upazila; without this the তালিকা's
            // ইউনিয়ন column was empty for every row this factory made on its own.
            'union_id' => Union::inRandomOrder()->value('id'),
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

    public function assigned(): static
    {
        return $this->state(fn () => [
            'status' => ComplaintStatus::ASSIGNED->value,
            'assigned_at' => now(),
            'due_date' => $this->faker->dateTimeBetween('now', '+1 week')->format('Y-m-d'),
            // The status literally means "তদন্ত কর্মকর্তা নিযুক্ত", so one has to be. Without this
            // the state produced rows whose তদন্তকারী কর্মকর্তা column was empty; only the seeders
            // that happened to pass an officer of their own were coherent.
            'investigating_officer_id' => User::where('role', Role::INVESTIGATING_OFFICER)
                ->inRandomOrder()
                ->value('id'),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => ComplaintStatus::REJECTED->value,
            'rejected_at' => now(),
        ]);
    }

    public function completed(): static
    {
        return $this->assigned()->state(fn () => [
            'status' => ComplaintStatus::COMPLETED->value,
            'completed_at' => now(),
        ]);
    }
}
