<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side enforcement that read-only roles (the DC — §3, §11) can never mutate data.
 * Applied to every state-changing route; blocks non-idempotent HTTP verbs for read-only users
 * regardless of what the UI exposes.
 */
class DenyReadOnlyWrites
{
    private const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->isReadOnly() && in_array($request->getMethod(), self::WRITE_METHODS, true)) {
            abort(403, 'আপনার শুধুমাত্র দেখার অনুমতি আছে।');
        }

        return $next($request);
    }
}
