<?php

declare(strict_types=1);

return [
    /**
     * BDRIS gateway driver. `mock` generates registration numbers locally for development; a real
     * adapter is added here and bound in AppServiceProvider once SEAL secures official access.
     */
    'driver' => env('BDRIS_DRIVER', 'mock'),

    // Real-integration configuration (per-tenant overridable for self-host, §10).
    'endpoint' => env('BDRIS_ENDPOINT'),
    'api_key' => env('BDRIS_API_KEY'),
];
