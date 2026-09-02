<?php

namespace App\Enums;

// Roles & RBAC (SURAHA_BUILD_PROMPT §3). String values match the frontend Role union exactly so the
// API and PWA agree without translation.
enum Role: string
{
    case Fwa = 'fwa';                 // পরিবার কল্যাণ সহকারী
    case Sochib = 'sochib';           // ইউপি সচিব
    case Uno = 'uno';                 // উপজেলা নির্বাহী কর্মকর্তা
    case Investigator = 'investigator'; // তদন্ত কর্মকর্তা
    case Dc = 'dc';                   // জেলা প্রশাসক (read-only, district scope)
    case Seal = 'seal';               // সুরাহা অ্যাডমিন (all upazilas)
    case Citizen = 'citizen';         // নাগরিক

    /** Officers are every role except citizen; they log in with credentials, not OTP. */
    public function isOfficer(): bool
    {
        return $this !== self::Citizen;
    }

    /** DC is read-only server-side (§3): it may view across its district but takes no actions. */
    public function isReadOnly(): bool
    {
        return $this === self::Dc;
    }

    /** Cross-tenant roles: SEAL sees all upazilas, DC sees its whole district. */
    public function isCrossTenant(): bool
    {
        return $this === self::Seal || $this === self::Dc;
    }

    /** Bangla label for the designation/profile chip. */
    public function label(): string
    {
        return match ($this) {
            self::Fwa => 'পরিবার কল্যাণ সহকারী',
            self::Sochib => 'ইউপি সচিব',
            self::Uno => 'উপজেলা নির্বাহী কর্মকর্তা',
            self::Investigator => 'তদন্ত কর্মকর্তা',
            self::Dc => 'জেলা প্রশাসক',
            self::Seal => 'সুরাহা অ্যাডমিন',
            self::Citizen => 'নাগরিক',
        };
    }
}
