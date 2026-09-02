<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Role gate (SURAHA_BUILD_PROMPT §3): `role:uno,seal` on a route restricts it to those roles. Applied
// after auth:sanctum, so a user is always present here.
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role->value, $roles, true)) {
            abort(403, 'এই কাজের অনুমতি নেই।');
        }

        return $next($request);
    }
}
