<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\SuggestionKind;
use App\Enums\SuggestionStatus;
use App\Models\Suggestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Suggestion> */
class SuggestionFactory extends Factory
{
    protected $model = Suggestion::class;

    private const IDEAS = [
        ['খেয়াঘাটে একটি সেতু নির্মাণ প্রয়োজন', 'প্রতিদিন কয়েকশ শিক্ষার্থী নৌকায় পার হয়; বর্ষায় ঝুঁকি অনেক বেড়ে যায়।'],
        ['উত্তরপাড়ায় প্রাথমিক বিদ্যালয় স্থাপন', 'নিকটতম বিদ্যালয় তিন কিলোমিটার দূরে, শিশুরা ঝরে পড়ছে।'],
        ['বাজার সড়ক পাকাকরণ', 'কাঁচা রাস্তায় বর্ষায় কৃষিপণ্য পরিবহন প্রায় অসম্ভব হয়ে পড়ে।'],
        ['কমিউনিটি ক্লিনিকে চিকিৎসক নিয়োগ', 'ক্লিনিক আছে কিন্তু নিয়মিত চিকিৎসক না থাকায় সেবা মিলছে না।'],
        ['গভীর নলকূপ স্থাপন', 'শুষ্ক মৌসুমে খাবার পানির তীব্র সংকট দেখা দেয়।'],
        ['উপজেলা পরিষদ চত্বরে পাঠাগার', 'তরুণদের জন্য পড়াশোনার কোনো উন্মুক্ত জায়গা নেই।'],
    ];

    private const NAMES = ['মো. শাহীন আলম', 'রোকসানা পারভীন', 'আনোয়ার হোসেন', 'তাসলিমা বেগম', 'মিজানুর রহমান'];

    public function definition(): array
    {
        [$title, $description] = fake()->randomElement(self::IDEAS);

        return [
            'status' => SuggestionStatus::PENDING,
            'kind' => fake()->randomElement(SuggestionKind::cases()),
            'is_confidential' => fake()->boolean(20),
            'applicant_name' => fake()->randomElement(self::NAMES),
            'title' => $title,
            'description' => $description,
            'ward_no' => fake()->numberBetween(1, 9),
            'mobile' => '01'.fake()->numerify('#########'),
            'tracking_token' => 'SUR-SUG-'.strtoupper(fake()->unique()->bothify('??####')),
        ];
    }

    public function accepted(): static
    {
        return $this->state(fn () => [
            'status' => SuggestionStatus::ACCEPTED,
            'decided_at' => now(),
            'decision_note' => 'পরামর্শটি আগামী অর্থবছরের পরিকল্পনায় অন্তর্ভুক্ত করা হলো।',
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => SuggestionStatus::REJECTED,
            'decided_at' => now(),
            'decision_note' => 'বর্তমান বাজেটে সম্ভব নয়; পরবর্তীতে বিবেচনা করা হবে।',
        ]);
    }
}
