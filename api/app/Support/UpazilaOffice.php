<?php

declare(strict_types=1);

namespace App\Support;

/**
 * স্থান — the UNO office of the current upazila. Every সাক্ষাৎকার and every অভিযোগ শুনানি is held
 * there, so the address is derived rather than stored, and derived in one place so the SMS, the
 * .ics feeds and the UI can never disagree.
 *
 * Postal order (office, upazila, district) so calendars geocode it and link it to Maps
 * themselves: "উপজেলা নির্বাহী অফিসারের কার্যালয়, ডুমুরিয়া, খুলনা".
 */
final class UpazilaOffice
{
    public static function nameBn(): string
    {
        $tenant = tenant();

        return implode(', ', array_filter([
            'উপজেলা নির্বাহী অফিসারের কার্যালয়',
            $tenant?->name_bn,
            $tenant?->district?->name_bn,
        ]));
    }
}
