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

    private const NAMES = [
        'রিমন মিয়া', 'সুজন', 'আরিফুল ইসলাম', 'মোশারফ', 'তাহমিদ', 'সোহেল',
        'রোকেয়া বেগম', 'নাজমুন নাহার', 'আব্দুল কাদের', 'শাহানা পারভীন',
        'মিজানুর রহমান', 'ফরিদা ইয়াসমিন', 'জাহাঙ্গীর আলম', 'সালমা খাতুন',
    ];

    /**
     * [সাক্ষাতের কারন, বিস্তারিত বিবরণ] — the subjects an upazila office actually gets, with the
     * বিবরণ deliberately ranging from one clause to a full paragraph so the তালিকা's clipped
     * column and the detail page are both exercised. A null বিবরণ is the "cause only" case.
     */
    private const REQUESTS = [
        ['ভূমি সংক্রান্ত সমস্যা', 'পৈতৃক জমির সীমানা নিয়ে প্রতিবেশীর সাথে দীর্ঘদিন ধরে বিরোধ চলছে। একাধিকবার স্থানীয়ভাবে সালিশ হলেও কোনো সুরাহা হয়নি। সর্বশেষ জরিপের কাগজপত্র ও দাগ নম্বরসহ মহোদয়ের নিকট বিষয়টি উপস্থাপন করতে চাই।'],
        ['নাগরিক সনদের আবেদন', 'পাসপোর্ট করার জন্য জরুরি ভিত্তিতে নাগরিক সনদ প্রয়োজন।'],
        ['রাস্তা মেরামতের অনুরোধ', 'গত বর্ষায় আমাদের গ্রামের প্রধান সংযোগ সড়কটি সম্পূর্ণ ভেঙে গেছে। বর্তমানে অ্যাম্বুলেন্স তো দূরের কথা, রিকশা-ভ্যানও চলাচল করতে পারছে না। প্রায় সাতশ পরিবার এতে ক্ষতিগ্রস্ত হচ্ছে। এলাকাবাসীর পক্ষ থেকে একটি স্মারকলিপি নিয়ে সাক্ষাৎ করতে চাই।'],
        ['শিক্ষা প্রতিষ্ঠান সংক্রান্ত', 'বিদ্যালয়ের নতুন ভবন নির্মাণের বরাদ্দ বিষয়ে আলোচনা।'],
        ['ব্যক্তিগত সাক্ষাৎ', null],
        ['বয়স্ক ভাতার আবেদন', 'আমার বয়স ৬৮ বছর, কোনো উপার্জনক্ষম সন্তান নেই। ভাতার তালিকায় নাম অন্তর্ভুক্তির জন্য আবেদন করেছিলাম কিন্তু এখনো কোনো ফলাফল পাইনি।'],
        ['টিউবওয়েল স্থাপনের আবেদন', 'আমাদের ওয়ার্ডে বিশুদ্ধ খাবার পানির তীব্র সংকট রয়েছে। নিকটতম গভীর নলকূপটি প্রায় দেড় কিলোমিটার দূরে।'],
        ['ভিজিডি কার্ড সংক্রান্ত', null],
        ['বাল্যবিবাহ প্রতিরোধে অভিযোগ', 'প্রতিবেশীর নবম শ্রেণিতে পড়ুয়া মেয়ের বিয়ের আয়োজন চলছে বলে জানতে পেরেছি। বিষয়টি গোপনে মহোদয়কে অবহিত করতে চাই।'],
        ['খাস জমি বন্দোবস্তের আবেদন', 'ভূমিহীন পরিবার হিসেবে খাস জমি বন্দোবস্ত পাওয়ার জন্য প্রয়োজনীয় কাগজপত্র জমা দিয়েছি। আবেদনের বর্তমান অবস্থা জানতে চাই এবং সরেজমিন তদন্তের অনুরোধ করতে চাই।'],
        ['ব্যবসা প্রতিষ্ঠানের লাইসেন্স', 'নতুন মুদি দোকানের ট্রেড লাইসেন্স নবায়ন প্রসঙ্গে।'],
        ['ত্রাণ সামগ্রী বিতরণ সংক্রান্ত', 'গত মাসের ঘূর্ণিঝড়ে আমাদের ইউনিয়নের চরাঞ্চলের প্রায় দুইশ পরিবারের ঘরবাড়ি ক্ষতিগ্রস্ত হয়েছে। এখন পর্যন্ত অনেক পরিবার খোলা আকাশের নিচে রয়েছে। ঢেউটিন ও নগদ সহায়তা বরাদ্দের বিষয়ে সরাসরি আলোচনা করা প্রয়োজন।'],
        ['মুক্তিযোদ্ধা সনদ যাচাই', 'পিতার মুক্তিযোদ্ধা সনদের তথ্য সংশোধনের বিষয়ে।'],
        ['পুকুর দখল সংক্রান্ত অভিযোগ', 'সরকারি পুকুরটি স্থানীয় প্রভাবশালী একটি পক্ষ জোরপূর্বক দখল করে মাছ চাষ করছে।'],
        ['জন্ম নিবন্ধন সংশোধন', null],
    ];

    public function definition(): array
    {
        [$purpose, $description] = $this->faker->randomElement(self::REQUESTS);

        return [
            'status' => AppointmentStatus::PENDING->value,
            'applicant_name' => $this->faker->randomElement(self::NAMES),
            'ward_no' => $this->faker->numberBetween(1, 9),
            'address' => 'গলাচিপা সদর, ওয়ার্ড '.$this->faker->numberBetween(1, 9),
            'mobile' => '01'.$this->faker->numberBetween(3, 9).$this->faker->numerify('########'),
            'purpose' => $purpose,
            'description' => $description,
            'appointment_date' => $this->faker->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
            // Office hours on the half hour — a সাক্ষাৎকার at 03:47 is not a thing.
            'appointment_time' => sprintf('%02d:%02d', $this->faker->numberBetween(9, 16), $this->faker->randomElement([0, 30])),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => AppointmentStatus::APPROVED->value, 'decided_at' => now()]);
    }

    private const REJECTION_NOTES = [
        'উক্ত তারিখে মহোদয়ের দাপ্তরিক কর্মসূচি পূর্বনির্ধারিত থাকায় সাক্ষাৎ সম্ভব হয়নি। আগামী সপ্তাহে পুনরায় আবেদন করুন।',
        'বিষয়টি সংশ্লিষ্ট ইউনিয়ন পরিষদের এখতিয়ারভুক্ত। প্রথমে ইউপি চেয়ারম্যান বরাবর আবেদন করুন।',
        'আবেদনে উল্লিখিত মোবাইল নম্বরে যোগাযোগ করা যায়নি এবং প্রয়োজনীয় কাগজপত্র সংযুক্ত ছিল না।',
        'একই বিষয়ে পূর্বেও সাক্ষাৎ অনুষ্ঠিত হয়েছে; নতুন কোনো তথ্য সংযুক্ত না থাকায় আবেদনটি নাকচ করা হলো।',
        'সাক্ষাতের কারণ সুস্পষ্টভাবে উল্লেখ করা হয়নি। বিস্তারিত বিবরণসহ পুনরায় আবেদন করুন।',
        'বিষয়টি অভিযোগ হিসেবে দাখিলযোগ্য। অনুগ্রহ করে অভিযোগ ফরমে আবেদন করুন।',
    ];

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => AppointmentStatus::REJECTED->value,
            'decided_at' => now(),
            // Left blank now and then — the detail page has to read well without a note too.
            'decision_note' => $this->faker->boolean(75)
                ? $this->faker->randomElement(self::REJECTION_NOTES)
                : null,
        ]);
    }
}
