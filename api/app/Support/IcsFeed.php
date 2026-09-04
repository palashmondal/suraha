<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/**
 * iCalendar feeds, so a UNO can subscribe to a Suraha calendar from Google Calendar
 * (Other calendars → From URL) with no Google account linking on our side.
 *
 * Feeds are unauthenticated — Google sends no Bearer token — so the URL itself is the secret:
 * a per-upazila, per-calendar HMAC. Read-only and one-way.
 */
final class IcsFeed
{
    /** All-day when a record carries only a date; otherwise this is the slot length. */
    public const DEFAULT_MINUTES = 30;

    /** The feed URL's secret. Rotating APP_KEY invalidates every subscription. */
    public static function token(string $kind, string $tenantId): string
    {
        return substr(hash_hmac('sha256', $kind.'-feed:'.$tenantId, (string) config('app.key')), 0, 32);
    }

    public static function url(string $path, string $kind, string $tenantId): string
    {
        return url($path.'?t='.self::token($kind, $tenantId));
    }

    /**
     * @param  array<int, array{uid: string, stamp: Carbon, date: string, time: ?string,
     *     minutes?: int, summary: string, description?: string, location?: string}>  $events
     */
    public static function response(string $calendarName, string $filename, array $events): Response
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Suraha//Calendar//BN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:'.self::esc($calendarName),
            'X-WR-TIMEZONE:Asia/Dhaka',
        ];

        foreach ($events as $e) {
            $lines = array_merge($lines, [
                'BEGIN:VEVENT',
                'UID:'.$e['uid'],
                'DTSTAMP:'.$e['stamp']->clone()->utc()->format('Ymd\THis\Z'),
                // Bumped on every edit so subscribers replace the event rather than duplicate it.
                'SEQUENCE:'.$e['stamp']->getTimestamp(),
                ...self::when($e['date'], $e['time'] ?? null, $e['minutes'] ?? self::DEFAULT_MINUTES),
                'SUMMARY:'.self::esc($e['summary']),
                'DESCRIPTION:'.self::esc($e['description'] ?? ''),
                'LOCATION:'.self::esc($e['location'] ?? ''),
                'END:VEVENT',
            ]);
        }

        $lines[] = 'END:VCALENDAR';

        // ponytail: no 75-octet line folding; calendar clients accept long lines in practice.
        return response(implode("\r\n", $lines)."\r\n", 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    /** A timed slot in Asia/Dhaka (+06, no DST) rendered as UTC, or an all-day event. */
    private static function when(string $date, ?string $time, int $minutes): array
    {
        if ($time) {
            $start = Carbon::parse($date.' '.$time, 'Asia/Dhaka');

            return [
                'DTSTART:'.$start->clone()->utc()->format('Ymd\THis\Z'),
                'DTEND:'.$start->clone()->addMinutes($minutes)->utc()->format('Ymd\THis\Z'),
            ];
        }

        $day = Carbon::parse($date);

        return [
            'DTSTART;VALUE=DATE:'.$day->format('Ymd'),
            'DTEND;VALUE=DATE:'.$day->clone()->addDay()->format('Ymd'),
        ];
    }

    /** RFC 5545 text escaping. */
    private static function esc(string $value): string
    {
        return str_replace(['\\', "\n", ';', ','], ['\\\\', '\\n', '\\;', '\\,'], $value);
    }
}
