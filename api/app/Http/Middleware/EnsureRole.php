<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route guard: allow only the listed roles. Usage: ->middleware('role:uno,seal_admin').
 * Authorization is enforced here at the API layer, not merely hidden in the UI (§3).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_active) {
            abort(401, 'অননুমোদিত।');
        }

        if (! in_array($user->role->value, $roles, true)) {
            abort(403, 'এই কাজের অনুমতি নেই।');
        }

        return $next($request);
    }
}
