<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            // Resolve the upazila (tenant) from the request subdomain, e.g. galachipa.suraha.net
            'tenant' => \Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain::class,
            // Front door: routes a request to central / district / upazila handling.
            'host' => \App\Http\Middleware\ResolveHost::class,
            'tenant.prevent-central' => \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
            // A deactivated upazila's subdomain serves nothing but the "disabled" notice.
            'tenant.active' => \App\Http\Middleware\EnsureTenantActive::class,
            // For cross-tenant roles (SEAL/DC) on the admin host: resolve the upazila from
            // the X-Upazila header so they can switch context without changing the URL.
            'tenant.selected' => \App\Http\Middleware\ApplySelectedTenant::class,
            // RBAC (see app/Http/Middleware)
            'role' => \App\Http\Middleware\EnsureRole::class,
            'deny.readonly' => \App\Http\Middleware\DenyReadOnlyWrites::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
