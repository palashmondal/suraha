<?php

use App\Http\Controllers\Auth\CitizenAuthController;
use App\Http\Controllers\Auth\OfficerAuthController;
use Illuminate\Support\Facades\Route;

// Milestone 2 — auth, RBAC & tenancy (SURAHA_BUILD_PROMPT §13.2). The tenant is resolved from the
// subdomain on every request; officers authenticate with credentials, citizens with mobile + OTP.
// Module routes (pregnancy, complaints, appointments…) land here in Milestones 4–9 behind the same
// auth:sanctum + role + can.write + tenant stack.

Route::middleware('tenant')->group(function () {

    // Public auth endpoints (the PWA calls these before it holds a token).
    Route::prefix('auth')->group(function () {
        Route::post('officer/login', [OfficerAuthController::class, 'login']);
        Route::post('citizen/otp', [CitizenAuthController::class, 'requestOtp']);
        Route::post('citizen/verify', [CitizenAuthController::class, 'verify']);
    });

    // Authenticated account endpoints (available to every logged-in role, DC included).
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [OfficerAuthController::class, 'logout']);
        Route::get('auth/me', [OfficerAuthController::class, 'me']);

        // Module routes (Milestones 4–9) mount here. `can.write` blocks DC (read-only) from any
        // mutating request; `role:...` restricts an action to specific roles. Pattern:
        //   Route::middleware('can.write')->group(function () {
        //       Route::apiResource('complaints', ComplaintController::class);
        //       Route::post('notices', [NoticeController::class, 'store'])->middleware('role:uno,seal');
        //   });
    });
});
