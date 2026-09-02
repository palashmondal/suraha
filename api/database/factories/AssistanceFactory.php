<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AssistanceKind;
use App\Enums\AssistanceStatus;
use App\Models\Assistance;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Assistance> */
class AssistanceFactory extends Factory
{
    protected $model = Assistance::class;

    private const NEEDS = [
        ['আর্থিক সহায়তার আবেদন', 'পরিবারের একমাত্র উপার্জনক্ষম ব্যক্তি অসুস্থ, চিকিৎসার খরচ বহন করা সম্ভব হচ্ছে না।'],
        ['চিকিৎসা সহায়তা প্রয়োজন', 'হৃদরোগের অস্ত্রোপচারের জন্য জরুরি সহায়তা প্রয়োজন।'],
        ['শিক্ষা সহায়তার আবেদন', 'সন্তানের কলেজ ভর্তির খরচ বহনে অসমর্থ।'],
        ['ঘূর্ণিঝড়ে ক্ষতিগ্রস্ত ঘর মেরামত', 'ঘূর্ণিঝড়ে ঘরের চাল উড়ে গেছে, মেরামতের সামর্থ্য নেই।'],
        ['খাদ্য সহায়তার আবেদন', 'কর্মহীন অবস্থায় পরিবারের খাদ্য সংস্থান কঠিন হয়ে পড়েছে।'],
        ['বন্যায় ফসলহানি', 'বন্যায় সম্পূর্ণ ফসল নষ্ট হয়েছে, পুনর্বাসন সহায়তা প্রয়োজন।'],
    ];

    private const NAMES = ['মোসা. রহিমা বেগম', 'আব্দুল করিম', 'সালেহা খাতুন', 'মো. জসিম উদ্দিন', 'ফাতেমা আক্তার', 'নূরুল ইসলাম'];

    public function definition(): array
    {
        [$title, $description] = fake()->randomElement(self::NEEDS);

        return [
            'status' => AssistanceStatus::PENDING,
            'kind' => fake()->randomElement(AssistanceKind::cases()),
            'applicant_name' => fake()->randomElement(self::NAMES),
            'title' => $title,
            'description' => $description,
            'ward_no' => fake()->numberBetween(1, 9),
            'mobile' => '01'.fake()->numerify('#########'),
            'address' => 'গ্রাম: '.fake()->randomElement(['চরকাজল', 'পানপট্টি', 'ডাকুয়া', 'গোলখালী']),
            'amount_requested' => fake()->randomElement([5000, 10000, 15000, 20000, 25000, 50000]),
            'tracking_token' => 'SUR-AID-'.strtoupper(fake()->unique()->bothify('??####')),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => AssistanceStatus::APPROVED,
            'decided_at' => now(),
            'amount_approved' => $attrs['amount_requested'] ?? null,
            'decision_note' => 'আবেদন যাচাই শেষে অনুমোদন করা হলো।',
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => AssistanceStatus::REJECTED,
            'decided_at' => now(),
            'decision_note' => 'প্রয়োজনীয় কাগজপত্র সংযুক্ত না থাকায় নাকচ করা হলো।',
        ]);
    }
}
