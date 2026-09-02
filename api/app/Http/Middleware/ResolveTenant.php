<?php

namespace App\Http\Middleware;

use App\Models\Upazila;
use App\Support\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Resolves the tenant (upazila) for the request from the subdomain, e.g. golachipa.suraha.com.bd →
// "golachipa" (SURAHA_BUILD_PROMPT §12). In local/dev the PWA also sends an X-Suraha-Tenant header,
// which is honored only when the host itself carries no tenant subdomain. The server stays the
// authority: module queries are constrained to Tenant::id() by the BelongsToTenant scope.
class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $subdomain = $this->subdomainFromHost($request->getHost())
            ?? $request->header('X-Suraha-Tenant');

        $upazila = $subdomain
            ? Upazila::where('subdomain', $subdomain)->with('district')->first()
            : null;

        // Cross-tenant roles (DC/SEAL) may see beyond the resolved upazila; everyone else is confined.
        $user = $request->user();
        $crossTenant = $user !== null && $user->role->isCrossTenant();

        Tenant::set($upazila, $crossTenant);

        try {
            return $next($request);
        } finally {
            Tenant::clear();
        }
    }

    private function subdomainFromHost(string $host): ?string
    {
        if ($host === 'localhost' || filter_var($host, FILTER_VALIDATE_IP)) {
            return null;
        }
        $parts = explode('.', $host);

        // Need at least sub.domain.tld for a tenant subdomain to exist.
        return count($parts) > 2 ? $parts[0] : null;
    }
}
