<?php

use Dotenv\Dotenv;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

// Every third-party credential lives in infra/.env, shared with the web app (whose Vite envDir
// points at the same file) and with docker compose, so a key is set or rotated in one place.
// Loaded before the framework reads api/.env, which keeps only this app's own plumbing (APP_KEY,
// DB_*, mail). In the container the file is absent and these arrive as real env vars, so
// safeLoad() is a no-op there.
Dotenv::createImmutable(dirname(__DIR__, 2).'/infra')->safeLoad();

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

        // Everything the app aborts with is already Bangla (see the middleware/controllers);
        // what leaks English is the framework's own defaults — "Unauthenticated.",
        // "This action is unauthorized.", an empty 404. Swap those for plain Bangla here so
        // no caller has to pass a message, and leave any non-ASCII (i.e. Bangla) message alone.
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $message = $e->getMessage();

            if ($message === '' || ! preg_match('/[^\x00-\x7F]/', $message)) {
                $message = match ($e->getStatusCode()) {
                    401 => 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।',
                    403 => 'এই কাজের অনুমতি নেই।',
                    404 => 'তথ্যটি খুঁজে পাওয়া যায়নি।',
                    405 => 'এই অনুরোধটি সমর্থিত নয়।',
                    413 => 'ফাইলটি অনেক বড়।',
                    419 => 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।',
                    429 => 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
                    503 => 'সেবাটি এখন সাময়িকভাবে বন্ধ আছে।',
                    default => 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।',
                };
            }

            return response()->json(['message' => $message], $e->getStatusCode());
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(
                ['message' => 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।'],
                401,
            );
        });
    })->create();
