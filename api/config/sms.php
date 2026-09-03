<?php

declare(strict_types=1);

return [
    /**
     * The gateway implementation. `log` writes OTPs to the log for development; a real
     * provider is added here and bound in AppServiceProvider once SEAL supplies credentials.
     */
    'gateway' => env('SMS_GATEWAY', 'log'),

    'log_channel' => env('SMS_LOG_CHANNEL', 'stack'),

    // OTP lifetime (seconds) and per-phone attempt cap.
    'otp_ttl' => (int) env('OTP_TTL', 300),
    'otp_max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
];
