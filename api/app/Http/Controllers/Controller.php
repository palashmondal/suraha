<?php

declare(strict_types=1);

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Refuse a request that reached a tenant-scoped endpoint without an upazila resolved — a
     * central-host call to something that only means anything inside one upazila.
     *
     * Five controllers carried an identical private copy of this; AuthController keeps its own,
     * whose message names the subdomain because that is the fix at the point of login.
     */
    protected function requireTenant(): void
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
    }

    /**
     * Same, but for a **listing**: a cross-tenant role (SEAL globally, a DC across their district)
     * reading the console's "সকল উপজেলা" view is not missing an upazila — they are asking for all
     * of the ones they oversee, which is what the dashboards have always given them. Only a
     * single-upazila role still needs one, because their records mean nothing outside it.
     *
     * The filtering itself is VisibleTenantScope's job; this only decides whether the request is
     * answerable at all.
     */
    protected function requireTenantForListing(\App\Models\User $user): void
    {
        abort_unless(tenancy()->initialized || $user->role->isCrossTenant(), 400, 'উপজেলা নির্ধারণ করা যায়নি।');
    }

    /**
     * Numbers are displayed in Bengali digits, so that is how they are typed into a search box.
     * Fold them to ASCII before they meet a numeric column.
     */
    protected function asciiDigits(string $q): string
    {
        return strtr($q, ['০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9']);
    }
}
