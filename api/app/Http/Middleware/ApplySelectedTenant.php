<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Upazila;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * In-app upazila switching for cross-tenant roles (SEAL / DC).
 *
 * Upazila-level users arrive on their own subdomain, where the `tenant` middleware has already
 * initialized tenancy — this middleware leaves that untouched. SEAL/DC work on the admin host
 * (a central domain, so no subdomain tenant was resolved); they pick an upazila in the UI, sent
 * as the `X-Upazila` header. On the admin host we resolve that header to a tenant — after
 * verifying the user may access it — so the rest of the request scopes to the selected upazila
 * with no URL/host change.
 *
 * Runs INSIDE the auth group (needs the authenticated user).
 */
class ApplySelectedTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $isCentralHost = in_array(
            $request->getHost(),
            config('tenancy.central_domains', []),
            true,
        );
        // A district host (patuakhali.suraha.net) resolves no tenant either, and the DC switches
        // upazila there exactly as SEAL does centrally — bounded by canAccessTenant, which for a
        // DC only ever admits their own district.
        $isDistrictHost = (bool) $request->attributes->get('district');

        // On a real upazila subdomain, tenancy is already correctly set — do nothing.
        if (! $isCentralHost && ! $isDistrictHost) {
            return $next($request);
        }

        // On a central or district host, no subdomain tenant was resolved. Clear any tenancy left
        // initialized by a previous request in this process, then resolve from the header.
        if (tenancy()->initialized) {
            tenancy()->end();
        }

        $selected = $request->header('X-Upazila');
        $user = $request->user();

        if ($selected && $user) {
            if (! $user->canAccessTenant($selected)) {
                abort(403, 'এই উপজেলায় আপনার প্রবেশাধিকার নেই।');
            }

            $upazila = Upazila::find($selected);
            if (! $upazila) {
                abort(404, 'উপজেলা খুঁজে পাওয়া যায়নি।');
            }

            tenancy()->initialize($upazila);
        }

        return $next($request);
    }
}
