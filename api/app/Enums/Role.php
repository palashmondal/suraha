<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The seven Suraha roles (SURAHA_BUILD_PROMPT §3). Each carries its Bangla label plus the
 * RBAC facts the API enforces: tenant-scope level, read-only-ness, and cross-tenant reach.
 */
enum Role: string
{
    case FWA = 'fwa';                              // পরিবার কল্যাণ সহকারী
    case UP_SOCHIB = 'up_sochib';                  // ইউপি সচিব
    case UNO = 'uno';                              // উপজেলা নির্বাহী কর্মকর্তা
    case INVESTIGATING_OFFICER = 'investigating_officer'; // তদন্ত কর্মকর্তা
    case DC = 'dc';                                // জেলা প্রশাসক
    case SEAL_ADMIN = 'seal_admin';                // সুরাহা অ্যাডমিন
    case CITIZEN = 'citizen';                      // নাগরিক

    public function labelBn(): string
    {
        return match ($this) {
            self::FWA => 'পরিবার কল্যাণ সহকারী',
            self::UP_SOCHIB => 'ইউপি সচিব',
            self::UNO => 'উপজেলা নির্বাহী কর্মকর্তা',
            self::INVESTIGATING_OFFICER => 'তদন্ত কর্মকর্তা',
            self::DC => 'জেলা প্রশাসক',
            self::SEAL_ADMIN => 'সুরাহা অ্যাডমিন',
            self::CITIZEN => 'নাগরিক',
        };
    }

    /**
     * DC is a superior, READ-ONLY oversight role — enforced server-side (§3, §11).
     */
    public function isReadOnly(): bool
    {
        return $this === self::DC;
    }

    /**
     * SEAL operates above all tenants; DC above the upazilas within one district. Both may
     * switch upazila context. Everyone else is bound to a single upazila.
     */
    public function scope(): string
    {
        return match ($this) {
            self::SEAL_ADMIN => 'global',   // all upazilas, all districts
            self::DC => 'district',         // upazilas within own district
            default => 'tenant',            // single upazila
        };
    }

    public function isCrossTenant(): bool
    {
        return $this->scope() !== 'tenant';
    }

    public function isOfficer(): bool
    {
        return $this !== self::CITIZEN;
    }

    /**
     * Officers authenticate with username/password; citizens with mobile + OTP.
     */
    public function usesPasswordLogin(): bool
    {
        return $this->isOfficer();
    }

    /** Roles an admin may assign when provisioning officer accounts. */
    public static function assignableOfficerRoles(): array
    {
        return [
            self::FWA, self::UP_SOCHIB, self::UNO,
            self::INVESTIGATING_OFFICER, self::DC, self::SEAL_ADMIN,
        ];
    }
}
