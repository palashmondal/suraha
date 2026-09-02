<?php

// Suraha app configuration (SURAHA_BUILD_PROMPT §8). Integrations sit behind config so a self-hosted
// upazila can supply its own credentials without code changes (§1.1(8)).
return [

    // Citizen login OTP (§1.1(3)). SMS is used SOLELY to deliver these codes (§1.1(4)).
    'otp' => [
        'ttl' => (int) env('SURAHA_OTP_TTL', 300),        // seconds a code stays valid
        'max_attempts' => (int) env('SURAHA_OTP_MAX_ATTEMPTS', 5),
        // Dev-only fixed code that always verifies. NEVER set in production.
        'bypass_code' => env('SURAHA_OTP_BYPASS'),
    ],

    // SMS gateway driver. 'log' writes to the log (default/dev); a real gateway driver is bound in
    // AppServiceProvider and selected here.
    'sms' => [
        'driver' => env('SURAHA_SMS_DRIVER', 'log'),
    ],

    // Header the PWA sends in local/dev to name the tenant when the host has no subdomain.
    'tenant_header' => 'X-Suraha-Tenant',
];
