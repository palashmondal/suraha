<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Notification;
use App\Models\Upazila;
use Illuminate\Database\Seeder;

/**
 * Sample notifications for Galachipa so the bell + "সকল নোটিফিকেশন" page aren't empty on first
 * login. Real notifications are emitted when citizens/FWA file things (§9).
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $galachipa = Upazila::find('galachipa');
        if (! $galachipa) {
            return;
        }

        tenancy()->initialize($galachipa);

        // 20 demo notifications across modules, targeted to the UNO (the role most likely viewing
        // the dashboard). Spread over the last ~10 days; the older half is already read.
        $demo = [
            ['complaint', 'নতুন অভিযোগ দাখিল হয়েছে', 'খেয়াঘাটে বিশৃঙ্খলভাবে গাড়ি পার্কিং'],
            ['appointment', 'নতুন সাক্ষাৎকারের আবেদন', 'ভূমি সংক্রান্ত সমস্যা নিয়ে আলোচনা'],
            ['complaint', 'অভিযোগ তদন্তে অগ্রগতি', 'বাজার মনিটরিং সংক্রান্ত অভিযোগ তদন্তাধীন'],
            ['appointment', 'সাক্ষাৎকার অনুমোদিত হয়েছে', 'আগামীকাল সকাল ১১টায় নির্ধারিত'],
            ['pregnancy', 'নতুন প্রসূতি তথ্য যুক্ত হয়েছে', 'রিশা আক্তার — ওয়ার্ড ০১'],
            ['birth', 'নতুন জন্ম নিবন্ধন আবেদন', 'সন্তানের নাম: আরিয়ান হাসান'],
            ['complaint', 'জরুরি অভিযোগ', 'অবৈধ বালু উত্তোলনের অভিযোগ'],
            ['appointment', 'সাক্ষাৎকার বাতিল হয়েছে', 'আবেদনকারী উপস্থিত হননি'],
            ['pregnancy', 'উচ্চ ঝুঁকিপূর্ণ প্রসূতি চিহ্নিত', 'সাবিনা খাতুন — দ্রুত ফলোআপ প্রয়োজন'],
            ['birth', 'জন্ম সনদ প্রস্তুত', 'BDRIS থেকে সনদ ইস্যু হয়েছে'],
            ['complaint', 'অভিযোগ নিষ্পত্তি হয়েছে', 'রাস্তার লাইট মেরামত সম্পন্ন'],
            ['appointment', 'নতুন সাক্ষাৎকারের আবেদন', 'শিক্ষা প্রতিষ্ঠানের অনুদান বিষয়ে'],
            ['pregnancy', 'ডেলিভারি সম্পন্ন হয়েছে', 'ফারহানা বেগম — স্বাভাবিক প্রসব'],
            ['complaint', 'অভিযোগে তদন্ত কর্মকর্তা নিযুক্ত', 'পানি নিষ্কাশন সমস্যা'],
            ['birth', 'জন্ম নিবন্ধন এন্ট্রি বাকি', 'কার্যকর কিন্তু এন্ট্রি হয়নি — ৩টি'],
            ['appointment', 'আজকের সাক্ষাৎকার', 'মোট ৪টি সাক্ষাৎকার নির্ধারিত'],
            ['pregnancy', 'টিকা কার্যক্রম আপডেট', 'নতুন টিটি টিকার তথ্য যুক্ত হয়েছে'],
            ['complaint', 'অভিযোগের শুনানি নির্ধারিত', 'আগামী রবিবার সকাল ১০টা'],
            ['birth', 'নতুন জন্ম নিবন্ধন আবেদন', 'সন্তানের নাম: তাসনিয়া রহমান'],
            ['appointment', 'সাক্ষাৎকারের সময় পরিবর্তন', 'বিকাল ৩টা থেকে বিকাল ৪টা'],
        ];

        // Point each demo notification at a real record of its own module, so opening one lands
        // on a detail page instead of doing nothing. Falls back to null when the module has no
        // seeded record — birth notifications, for instance, have no detail page of their own.
        $pick = [
            'complaint' => \App\Models\Complaint::pluck('id')->all(),
            'appointment' => \App\Models\Appointment::pluck('id')->all(),
            'pregnancy' => \App\Models\Pregnancy::pluck('id')->all(),
        ];

        foreach ($demo as $i => [$type, $title, $detail]) {
            $ids = $pick[$type] ?? [];
            $link = $ids ? '/'.$type.'/'.$ids[array_rand($ids)] : null;

            Notification::create([
                'type' => $type,
                'target_role' => Role::UNO->value,
                'title' => $title,
                'detail' => $detail,
                'link' => $link,
                'created_at' => now()->subHours($i * 12 + random_int(0, 6)),
                'updated_at' => now()->subHours($i * 12),
                // The older half (added earlier) is already read.
                'read_at' => $i >= 10 ? now()->subHours($i * 12) : null,
            ]);
        }

        // A couple targeted at the ইউপি সচিব for their own bell.
        $aPregnancy = \App\Models\Pregnancy::value('id');
        Notification::create(['type' => 'pregnancy', 'target_role' => Role::UP_SOCHIB->value, 'title' => 'নতুন প্রসূতি তথ্য যুক্ত হয়েছে', 'detail' => 'রিশা আক্তার', 'link' => $aPregnancy ? '/pregnancy/'.$aPregnancy : null, 'created_at' => now()->subHours(2), 'updated_at' => now()]);
        Notification::create(['type' => 'birth', 'target_role' => Role::UP_SOCHIB->value, 'title' => 'নতুন জন্ম নিবন্ধন আবেদন', 'detail' => 'সন্তানের নাম: আরিয়ান হাসান', 'created_at' => now()->subHours(30), 'updated_at' => now()]);

        tenancy()->end();
    }
}
