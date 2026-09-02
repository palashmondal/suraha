<?php

use App\Http\Controllers\Admin\UpazilaController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\BirthRegistrationController;
use App\Http\Controllers\ComplaintController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OfficerController;
use App\Http\Controllers\PregnancyController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RegistryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API routes (Milestone 2 — Auth & Multi-tenancy)
|--------------------------------------------------------------------------
| Every route runs through the `tenant` middleware, which resolves the upazila from the
| request subdomain (galachipa.suraha.net). On a central domain (SEAL/DC admin, or
| localhost during dev) it proceeds without a tenant; an unknown subdomain 404s.
| Auth is Bearer-token (Sanctum); no cookies/CSRF.
*/

// Certificate gate for Caddy's on-demand TLS (infra/Caddyfile). Called by the proxy, never by a
// browser. Deliberately OUTSIDE the `tenant` group: the proxy reaches it over the internal
// network, so the request Host is the app container rather than the subdomain in ?domain=.
Route::get('tls/allowed', [RegistryController::class, 'tlsAllowed']);

Route::middleware(['host', 'tenant.active'])->group(function () {

    // ---- Public (unauthenticated) -------------------------------------
    Route::get('registry/host-context', [RegistryController::class, 'hostContext']);
    // Public upazila directory for the FWA mobile app's first-run picker (called on the central host).
    Route::get('upazilas/directory', [RegistryController::class, 'upazilaDirectory']);
    Route::get('registry/current-upazila', [RegistryController::class, 'currentUpazila']);
    Route::get('registry/unions', [RegistryController::class, 'unions']);
    Route::get('registry/districts', [RegistryController::class, 'districts']);
    Route::get('registry/divisions', [RegistryController::class, 'divisions']);
    Route::get('registry/upazila-options', [RegistryController::class, 'upazilaOptions']);

    Route::prefix('auth')->group(function () {
        Route::post('officer/login', [AuthController::class, 'officerLogin']);
        Route::post('citizen/request-otp', [AuthController::class, 'requestOtp']);
        Route::post('citizen/verify-otp', [AuthController::class, 'verifyOtp']);
    });

    // Public status lookup by tracking token (§7). No auth; throttled against enumeration.
    Route::get('track/{token}', [\App\Http\Controllers\TrackController::class, 'show'])
        ->middleware('throttle:20,1');

    // Public awareness content (§8.5 / §8.6) — landing page + dashboard.
    Route::get('sliders', [\App\Http\Controllers\SliderController::class, 'publicIndex']);
    Route::get('general-info', [\App\Http\Controllers\GeneralInfoController::class, 'publicIndex']);

    // ---- Authenticated (any role) -------------------------------------
    // tenant.selected lets cross-tenant roles (SEAL/DC) resolve the switched upazila from the
    // X-Upazila header when they are on the admin host (no subdomain).
    Route::middleware(['auth:sanctum', 'tenant.selected'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // Per-role dashboard stats (§13.3) — tenant-scoped, or SEAL/DC aggregate.
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Reporting & analytics (§8.7) — any officer; scope-aware (own upazila / district / all).
        Route::get('reports', [\App\Http\Controllers\ReportController::class, 'index'])
            ->middleware('role:fwa,up_sochib,uno,investigating_officer,dc,seal_admin');

        // A citizen's own submissions (complaints + appointments) with tracking tokens.
        Route::middleware('role:citizen')->get('my/submissions', [\App\Http\Controllers\MyController::class, 'submissions']);

        // In-app notification bell (§9) — role-targeted within the upazila.
        Route::get('notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::post('notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllRead']);
        Route::post('notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markRead']);

        // Profile self-service. deny.readonly is a no-op for writers but blocks a read-only
        // role (DC) from mutating anything, enforced server-side.
        Route::middleware('deny.readonly')->group(function () {
            Route::get('profile', [ProfileController::class, 'show']);
            Route::put('profile', [ProfileController::class, 'update']);
            Route::put('profile/password', [ProfileController::class, 'updatePassword']);
            Route::post('profile/avatar', [ProfileController::class, 'updateAvatar']);
        });

        // ---- প্রসূতি কল্যাণ (§8.1) --------------------------------------
        // View: any upazila officer + oversight. Write: FWA/SEAL only, and never a read-only DC.
        Route::middleware('role:fwa,up_sochib,uno,dc,seal_admin')->group(function () {
            Route::get('pregnancies', [PregnancyController::class, 'index']);
            Route::get('pregnancies/{pregnancy}', [PregnancyController::class, 'show']);

            Route::middleware(['deny.readonly', 'role:fwa,seal_admin'])->group(function () {
                Route::post('pregnancies', [PregnancyController::class, 'store']);
                Route::put('pregnancies/{pregnancy}', [PregnancyController::class, 'update']);
                Route::patch('pregnancies/{pregnancy}/delivery-status', [PregnancyController::class, 'updateDeliveryStatus']);
            });
        });

        // ---- জন্ম নিবন্ধন (§8.2) — Sochib manage; SEAL/DC/UNO view -------
        Route::middleware('role:up_sochib,uno,dc,seal_admin')->group(function () {
            Route::get('birth-registrations', [BirthRegistrationController::class, 'index']);
            Route::get('birth-registrations/{birthRegistration}', [BirthRegistrationController::class, 'show']);
            Route::get('birth-registrations/{birthRegistration}/certificate', [BirthRegistrationController::class, 'downloadCertificate']);

            Route::middleware(['deny.readonly', 'role:up_sochib,seal_admin'])->group(function () {
                Route::post('birth-registrations', [BirthRegistrationController::class, 'store']);
                Route::post('birth-registrations/{birthRegistration}/submit', [BirthRegistrationController::class, 'submit']);
                // Sochib approval of a delivered pregnancy → BDRIS → certificate.
                Route::post('pregnancies/{pregnancy}/approve', [BirthRegistrationController::class, 'approveFromPregnancy']);
            });
        });

        // ---- অভিযোগ (§8.4) ---------------------------------------------
        // File: citizen (or officer on behalf). View: UNO/investigator/DC/SEAL (investigators are
        // auto-scoped to their own assignments). Manage (accept/appoint, reject, schedule hearing,
        // order): UNO. Report: the assigned investigator.
        Route::middleware('deny.readonly', 'role:citizen,uno,seal_admin')
            ->post('complaints', [ComplaintController::class, 'store']);

        Route::middleware('role:uno,investigating_officer,dc,seal_admin')->group(function () {
            Route::get('complaints', [ComplaintController::class, 'index']);
            Route::get('complaints/{complaint}', [ComplaintController::class, 'show']);

            Route::middleware('deny.readonly', 'role:uno,seal_admin')->group(function () {
                Route::get('complaint-investigators', [ComplaintController::class, 'investigators']);
                Route::get('complaint-hearings', [ComplaintController::class, 'hearings']);
                Route::post('complaints/{complaint}/accept', [ComplaintController::class, 'accept']);
                Route::post('complaints/{complaint}/reject', [ComplaintController::class, 'reject']);
                Route::post('complaints/{complaint}/schedule-hearing', [ComplaintController::class, 'scheduleHearing']);
                Route::post('complaints/{complaint}/complete', [ComplaintController::class, 'complete']);
                Route::post('complaints/{complaint}/reinvestigate', [ComplaintController::class, 'reinvestigate']);
            });

            Route::middleware('deny.readonly', 'role:investigating_officer,seal_admin')
                ->post('complaints/{complaint}/report', [ComplaintController::class, 'report']);
        });

        // ---- সাক্ষাৎকার (§8.3) — citizen request; UNO decide; DC/SEAL view -
        Route::middleware('deny.readonly', 'role:citizen,uno,seal_admin')
            ->post('appointments', [AppointmentController::class, 'store']);

        Route::middleware('role:uno,dc,seal_admin')->group(function () {
            Route::get('appointments', [AppointmentController::class, 'index']);
            Route::get('appointment-schedule', [AppointmentController::class, 'schedule']);
            Route::get('appointments/{appointment}', [AppointmentController::class, 'show']);

            Route::middleware('deny.readonly', 'role:uno,seal_admin')->group(function () {
                Route::post('appointments/{appointment}/approve', [AppointmentController::class, 'approve']);
                Route::post('appointments/{appointment}/reject', [AppointmentController::class, 'reject']);
            });
        });

        // Upazila switcher — SEAL (all) / DC (own district) / others (own only).
        Route::get('registry/switchable-upazilas', [RegistryController::class, 'switchableUpazilas']);

        // The upazila the request is scoped to right now — resolved from the subdomain OR, for
        // cross-tenant roles on the admin host, from the switched X-Upazila (via tenant.selected).
        Route::get('registry/active-upazila', [RegistryController::class, 'currentUpazila']);

        // ---- Officer management (§8.6) — SEAL (any) + UNO (own upazila staff) ----
        Route::middleware('deny.readonly', 'role:seal_admin,uno')->group(function () {
            Route::get('officers', [OfficerController::class, 'index']);
            Route::get('officer-roles', [OfficerController::class, 'assignableRoles']);
            Route::post('officers', [OfficerController::class, 'store']);
            Route::patch('officers/{officer}/status', [OfficerController::class, 'updateStatus']);

            // Investigating officers (তদন্ত কর্মকর্তা তালিকা, §8.4) — mobile-keyed accounts the
            // UNO/SEAL add and then assign to complaints. Tenant-scoped.
            Route::get('investigating-officers', [OfficerController::class, 'investigators']);
            Route::post('investigating-officers', [OfficerController::class, 'storeInvestigator']);

            // Sliders (§8.5) + General Info (§8.6) management
            Route::get('manage/sliders', [\App\Http\Controllers\SliderController::class, 'index']);
            Route::post('manage/sliders', [\App\Http\Controllers\SliderController::class, 'store']);
            Route::post('manage/sliders/{slider}', [\App\Http\Controllers\SliderController::class, 'update']); // POST for multipart
            Route::delete('manage/sliders/{slider}', [\App\Http\Controllers\SliderController::class, 'destroy']);

            Route::get('manage/general-info', [\App\Http\Controllers\GeneralInfoController::class, 'index']);
            Route::post('manage/general-info', [\App\Http\Controllers\GeneralInfoController::class, 'store']);
            Route::put('manage/general-info/{generalInfo}', [\App\Http\Controllers\GeneralInfoController::class, 'update']);
            Route::delete('manage/general-info/{generalInfo}', [\App\Http\Controllers\GeneralInfoController::class, 'destroy']);
        });

        // ---- SEAL Admin only (§8.6, cross-tenant admin) ----------------
        Route::middleware('role:seal_admin')->group(function () {
            // Suraha instance (upazila / subdomain) management
            Route::get('upazilas', [UpazilaController::class, 'index']);
            Route::post('upazilas', [UpazilaController::class, 'store']);
            Route::get('upazilas/{upazila}', [UpazilaController::class, 'show']);
            Route::put('upazilas/{upazila}', [UpazilaController::class, 'update']);
            Route::delete('upazilas/{upazila}', [UpazilaController::class, 'destroy']);
        });
    });
});
