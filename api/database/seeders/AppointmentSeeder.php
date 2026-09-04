<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample সাক্ষাৎকার data for every upazila: requests across all three statuses, plus a filled
 * সাক্ষাৎকার সূচি — approved appointments spread over the coming fortnight. Galachipa additionally
 * carries the UNO's note threads, since that is where the walkthrough happens.
 */
class AppointmentSeeder extends Seeder
{
    /**
     * The সূচি itself: [days from today, HH:mm]. Several days carry more than one slot so the
     * calendar's day grouping has something to group, and one day is left deliberately empty.
     */
    private const SCHEDULE_SLOTS = [
        [1, '10:00'], [1, '11:30'], [1, '15:00'],
        [2, '09:30'], [2, '12:00'],
        [4, '10:30'],
        [5, '11:00'], [5, '11:30'], [5, '16:00'],
        [8, '09:30'], [8, '14:30'],
        [11, '10:00'],
        [14, '10:00'], [14, '15:30'],
    ];

    /** Follow-up notes as they actually accumulate — a line on the day, more as the matter moves. */
    private const NOTE_THREADS = [
        [
            'সাক্ষাৎ অনুষ্ঠিত হয়েছে। আবেদনকারীর বক্তব্য শোনা হয়েছে এবং প্রয়োজনীয় কাগজপত্র গ্রহণ করা হয়েছে।',
            'সহকারী কমিশনার (ভূমি) মহোদয়কে সরেজমিন তদন্তের জন্য নির্দেশনা দেওয়া হলো।',
            'তদন্ত প্রতিবেদন পাওয়া গেছে। আগামী সপ্তাহে উভয় পক্ষকে নিয়ে বসতে হবে।',
        ],
        [
            'আবেদনকারী নির্ধারিত সময়ে উপস্থিত হননি। মোবাইলে যোগাযোগ করে নতুন তারিখ জানাতে হবে।',
            'ফোনে কথা হয়েছে; আগামী রবিবার পুনরায় আসবেন বলে জানিয়েছেন।',
        ],
        // A single line is the common case — most সাক্ষাৎকার need no more than one.
        [
            'বিষয়টি নিষ্পত্তি হয়েছে। সংশ্লিষ্ট দপ্তরকে অবহিত করা হয়েছে, আর কোনো করণীয় নেই।',
        ],
        [
            'নাকচ করা হলেও আবেদনকারী পুনরায় যোগাযোগ করেছেন। প্রয়োজনীয় কাগজপত্র সংযুক্ত করে নতুন আবেদন করতে বলা হয়েছে।',
            'নতুন আবেদন এখনো পাওয়া যায়নি; এক সপ্তাহ পর খোঁজ নিতে হবে।',
        ],
    ];

    public function run(): void
    {
        foreach (Upazila::all() as $upazila) {
            tenancy()->initialize($upazila);

            Appointment::factory()->count(5)->create();                         // অপেক্ষমান
            $approved = Appointment::factory()->count(4)->approved()->create(); // অনুমোদিত
            $rejected = Appointment::factory()->count(2)->rejected()->create(); // নাকচ

            $this->seedSchedule();

            if ($upazila->id === 'galachipa') {
                $this->seedNotes($approved, $rejected);
            }

            tenancy()->end();
        }
    }

    /** The upcoming সূচি — what the UNO's calendar page and the .ics feed both read. */
    private function seedSchedule(): void
    {
        foreach (self::SCHEDULE_SLOTS as [$inDays, $time]) {
            Appointment::factory()->approved()->create([
                'appointment_date' => now()->addDays($inDays)->toDateString(),
                'appointment_time' => $time,
            ]);
        }
    }

    /**
     * The UNO's follow-up notes on a few decided requests, written on separate days so the detail
     * page's timeline has something to show. The rest stay empty — that is the normal state, and
     * the empty message has to read well too.
     */
    private function seedNotes(mixed $approved, mixed $rejected): void
    {
        $uno = User::where('username', 'uno_galachipa')->first();
        // One target per thread, in order: three অনুমোদিত, then a নাকচ one that kept moving.
        $targets = [$approved[0], $approved[1], $approved[2], $rejected[0]];

        foreach (self::NOTE_THREADS as $i => $thread) {
            $appointment = $targets[$i] ?? null;
            if (! $appointment) {
                continue;
            }

            foreach ($thread as $day => $body) {
                $appointment->notes()->create([
                    'body' => $body,
                    'author_id' => $uno?->id,
                    'created_at' => now()->subDays(count($thread) - $day - 1),
                ]);
            }
        }
    }
}
