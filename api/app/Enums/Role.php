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

    /**
     * Roles a UNO may appoint to investigate an অভিযোগ. A ইউপি সচিব carries out investigations
     * alongside their union work, so they appear in the appointment list and see their own
     * caseload exactly as a তদন্ত কর্মকর্তা does.
     */
    public function canInvestigate(): bool
    {
        return $this === self::INVESTIGATING_OFFICER || $this === self::UP_SOCHIB;
    }

    /** @return list<string> The `users.role` values {@see canInvestigate} accepts. */
    public static function investigatorRoles(): array
    {
        return array_values(array_map(
            fn (self $r) => $r->value,
            array_filter(self::cases(), fn (self $r) => $r->canInvestigate()),
        ));
    }

    /** Roles an admin may assign when provisioning officer accounts. */
    public static function assignableOfficerRoles(): array
    {
        // Listed by administrative seniority — the order the dropdowns show them in.
        return [
            self::DC, self::UNO, self::UP_SOCHIB,
            self::INVESTIGATING_OFFICER, self::FWA, self::SEAL_ADMIN,
        ];
    }
}
