<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Enforces DC's read-only rule server-side (SURAHA_BUILD_PROMPT §3, §10): a read-only role may issue
// safe (GET/HEAD/OPTIONS) requests but never a mutating one. Belt-and-suspenders alongside per-route
// role gates, so no write route can be reached by DC even if a gate is forgotten.
class EnsureCanWrite
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role->isReadOnly() && ! $request->isMethodSafe()) {
            abort(403, 'জেলা প্রশাসক কেবল পর্যবেক্ষণ করতে পারেন।');
        }

        return $next($request);
    }
}
