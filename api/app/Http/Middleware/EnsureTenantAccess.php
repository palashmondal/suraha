<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * A token is not a passport to every upazila.
 *
 * Login checks canAccessTenant against the host, and ApplySelectedTenant checks it against the
 * X-Upazila header — but nothing checked it on an ordinary request. A UNO could therefore point
 * their own valid token at another upazila's subdomain and read that upazila's records, because
 * tenancy resolves from the host while authorisation had been settled once, at login.
 *
 * Runs after tenancy is resolved (subdomain or switcher) and re-checks the pairing on every
 * request. SEAL passes everywhere, a DC within their district, everyone else in their own
 * upazila alone.
 */
class EnsureTenantAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && tenancy()->initialized && ! $user->canAccessTenant(tenant()->getTenantKey())) {
            abort(403, 'এই উপজেলায় আপনার প্রবেশাধিকার নেই।');
        }

        return $next($request);
    }
}
