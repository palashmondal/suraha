<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\District;
use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Symfony\Component\HttpFoundation\Response;

/**
 * Front door for every API request. Three kinds of host share one subdomain namespace:
 *
 *   suraha.net              → central: the product's landing page, with the SEAL console at /app.
 *   patuakhali.suraha.net   → district: the DC's read-only dashboard (no tenant either — the DC
 *                             aggregates over the district and narrows via X-Upazila).
 *   galachipa.suraha.net    → upazila: a tenant, resolved by stancl as before.
 *
 * District labels are checked FIRST, because stancl's subdomain middleware 404s any host that is
 * not a known tenant domain — a district host would never survive to reach our code. Anything
 * that is not a district falls through to the tenant resolver unchanged, so central and upazila
 * hosts behave exactly as they did.
 *
 * The namespace is kept collision-free upstream: no district slug may equal an upazila slug
 * (see the districts.slug migration), so this lookup can never be ambiguous.
 */
class ResolveHost
{
    public function __construct(private readonly InitializeTenancyBySubdomain $tenancy) {}

    public function handle(Request $request, Closure $next): Response
    {
        $label = self::subdomainLabel($request->getHost());

        if ($label !== null) {
            $district = District::where('slug', $label)->first();

            if ($district) {
                // Carried on the request rather than a global, so nothing leaks between requests.
                $request->attributes->set('district', $district);

                return $next($request);
            }
        }

        return $this->tenancy->handle($request, $next);
    }

    /**
     * The single label in front of a central domain, or null when the host is central itself,
     * is deeper than one label, or is not ours at all.
     */
    public static function subdomainLabel(string $host): ?string
    {
        // A host that is itself central has no tenant label to read.
        if (in_array($host, config('tenancy.central_domains', []), true)) {
            return null;
        }

        foreach (config('tenancy.central_domains', []) as $central) {
            $suffix = '.'.$central;

            if (str_ends_with($host, $suffix)) {
                $label = substr($host, 0, -strlen($suffix));

                return ($label !== '' && ! str_contains($label, '.')) ? $label : null;
            }
        }

        return null;
    }
}
