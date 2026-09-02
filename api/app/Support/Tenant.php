<?php

namespace App\Support;

use App\Models\Upazila;

// Holds the tenant (upazila) resolved for the current request. Set by the ResolveTenant middleware and
// read by the BelongsToTenant scope. Kept as a tiny static facade over a request-lifetime singleton so
// module code stays terse; nothing here persists between requests.
class Tenant
{
    private static ?Upazila $current = null;

    private static bool $crossTenant = false;

    public static function set(?Upazila $upazila, bool $crossTenant = false): void
    {
        self::$current = $upazila;
        self::$crossTenant = $crossTenant;
    }

    public static function current(): ?Upazila
    {
        return self::$current;
    }

    public static function id(): ?int
    {
        return self::$current?->id;
    }

    /** True when the active user sees across tenants (DC within a district, SEAL across all). */
    public static function isCrossTenant(): bool
    {
        return self::$crossTenant;
    }

    public static function clear(): void
    {
        self::$current = null;
        self::$crossTenant = false;
    }
}
