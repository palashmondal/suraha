<?php

declare(strict_types=1);

/**
 * CORS for the React SPA. Because auth is Bearer-token (not cookies), we don't need
 * supports_credentials; we just have to allow every per-upazila origin. Origins are matched
 * by pattern so any `{upazila}.suraha.net` / dev `{upazila}.lvh.me` host is accepted.
 */
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [
        '#^https?://([a-z0-9-]+\.)?suraha\.net(:\d+)?$#',
        '#^https?://([a-z0-9-]+\.)?lvh\.me(:\d+)?$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
