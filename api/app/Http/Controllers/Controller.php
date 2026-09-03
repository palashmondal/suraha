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
}
