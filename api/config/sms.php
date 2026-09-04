<?php

declare(strict_types=1);

return [
    /**
     * The gateway implementation. `log` writes messages to the log for development and sends
     * nothing; `alpha` is Alpha SMS (sms.net.bd), bound in AppServiceProvider.
     */
    'gateway' => env('SMS_GATEWAY', 'log'),

    'alpha' => [
        'api_key' => env('SMS_ALPHA_API_KEY'),
        // A masked sender (e.g. SURAHA) has to be approved by the provider first; unset, messages
        // go out from a shared non-masking number.
        'sender_id' => env('SMS_ALPHA_SENDER_ID'),
        'endpoint' => env('SMS_ALPHA_ENDPOINT', 'https://api.sms.net.bd/sendsms'),
        'timeout' => (int) env('SMS_ALPHA_TIMEOUT', 10),
    ],

    'log_channel' => env('SMS_LOG_CHANNEL', 'stack'),

    // OTP lifetime (seconds) and per-phone attempt cap.
    'otp_ttl' => (int) env('OTP_TTL', 300),
    'otp_max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
];
