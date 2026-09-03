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
        // Every request, before anything reads its input: fold Bangla text to one Unicode shape
        // (see the middleware — য়/ড়/ঢ় each have two encodings) and strip invalid UTF-8, which
        // Postgres rejects with a 500 rather than an empty result.
        $middleware->prepend(\App\Http\Middleware\NormalizeUnicode::class);

        $middleware->alias([
            // Front door: central host, district host (DC dashboard), or upazila tenant.
            'host' => \App\Http\Middleware\ResolveHost::class,
            // A deactivated upazila's subdomain serves nothing but the "disabled" notice.
            'tenant.active' => \App\Http\Middleware\EnsureTenantActive::class,
            // Cross-tenant roles pick an upazila with the X-Upazila header — SEAL on the
            // central host, the DC on its district host — without changing the URL.
            'tenant.selected' => \App\Http\Middleware\ApplySelectedTenant::class,
            // A token is only good for the upazilas its owner may reach.
            'tenant.access' => \App\Http\Middleware\EnsureTenantAccess::class,
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
