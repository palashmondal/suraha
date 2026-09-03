<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Takes a deactivated upazila's subdomain offline.
 *
 * Runs after the subdomain has resolved a tenant, so it only ever fires on an upazila host —
 * SEAL and DC work on the central host and keep full access to an inactive instance, which is
 * what lets SEAL switch it back on.
 *
 * `registry/host-context` is deliberately still served: the SPA calls it before anything else,
 * and letting it through is what allows the site to say it is disabled instead of failing in a
 * way the browser renders as the central site.
 */
class EnsureTenantActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if (tenancy()->initialized && ! tenant()->is_active && ! $request->is('api/registry/host-context')) {
            return response()->json([
                'message' => 'এই উপজেলার সাইটটি বর্তমানে নিষ্ক্রিয় করা হয়েছে।',
                'reason' => 'tenant_inactive',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return $next($request);
    }
}
