<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The Google-Calendar-subscribable .ics feed (§8.3, optional). */
class AppointmentCalendarTest extends TestCase
{
    use RefreshDatabase;

    private const GALACHIPA = 'http://galachipa.lvh.me';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_feed_serves_approved_appointments_and_rejects_a_bad_token(): void
    {
        Sanctum::actingAs(User::where('username', 'uno_galachipa')->firstOrFail());

        Upazila::find('galachipa')->run(function () {
            Appointment::query()->delete();
            Appointment::factory()->create([
                'status' => AppointmentStatus::APPROVED,
                'applicant_name' => 'রহিম; উদ্দিন',
                'purpose' => 'জমি, সংক্রান্ত',
                'appointment_date' => '2026-09-10',
                'appointment_time' => '10:30',
            ]);
            Appointment::factory()->create([
                'status' => AppointmentStatus::PENDING,
                'appointment_date' => '2026-09-11',
            ]);
        });

        $feedUrl = $this->getJson(self::GALACHIPA.'/api/appointment-schedule')->json('feed_url');
        $this->assertStringContainsString('/api/appointments/calendar.ics?t=', $feedUrl);

        $body = $this->get($feedUrl)->assertOk()->getContent();

        $this->assertStringContainsString('BEGIN:VCALENDAR', $body);
        // 10:30 Asia/Dhaka (+06, no DST) → 04:30 UTC; 30-minute slot.
        $this->assertStringContainsString('DTSTART:20260910T043000Z', $body);
        $this->assertStringContainsString('DTEND:20260910T050000Z', $body);
        // Title shape, with RFC 5545 escaping of the ; and , inside it.
        $this->assertStringContainsString('SUMMARY:সাক্ষাতকার: রহিম\; উদ্দিন — জমি\, সংক্রান্ত', $body);
        // Venue in postal order so Google geocodes it — the commas are escaped per RFC 5545.
        $this->assertStringContainsString(
            'LOCATION:উপজেলা নির্বাহী অফিসারের কার্যালয়\, গলাচিপা\, পটুয়াখালী',
            $body,
        );
        // The map link belongs to LOCATION, never the description body.
        $this->assertStringNotContainsString('maps.google', $body);
        // Approved only — the pending one is not on the calendar.
        $this->assertSame(1, substr_count($body, 'BEGIN:VEVENT'));

        $this->get(self::GALACHIPA.'/api/appointments/calendar.ics?t=wrong')->assertNotFound();
    }
}
