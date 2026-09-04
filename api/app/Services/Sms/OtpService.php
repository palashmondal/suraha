<?php

declare(strict_types=1);

namespace App\Services\Sms;

use Illuminate\Support\Facades\Cache;

/**
 * Issues and verifies short-lived login OTPs. Codes are cached (not persisted) with a TTL and
 * a per-phone attempt cap. In non-production the generated code is returned to the caller so
 * developers can complete the flow without reading logs.
 */
class OtpService
{
    public function __construct(private SmsGateway $sms) {}

    /**
     * Generate a code, "send" it via the gateway, and return it when not in production.
     */
    public function issue(string $phone): ?string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put($this->key($phone), [
            'code' => $code,
            'attempts' => 0,
        ], now()->addSeconds((int) config('sms.otp_ttl', 300)));

        $this->sms->send($phone, "আপনার সুরাহা লগইন কোড: {$code}", 'otp');

        return app()->environment('production') ? null : $code;
    }

    /**
     * Verify a submitted code. Consumes the code on success; enforces an attempt cap.
     */
    public function verify(string $phone, string $code): bool
    {
        $record = Cache::get($this->key($phone));

        if (! $record) {
            return false;
        }

        if ($record['attempts'] >= (int) config('sms.otp_max_attempts', 5)) {
            Cache::forget($this->key($phone));

            return false;
        }

        if (! hash_equals($record['code'], $code)) {
            $record['attempts']++;
            Cache::put($this->key($phone), $record, now()->addSeconds((int) config('sms.otp_ttl', 300)));

            return false;
        }

        Cache::forget($this->key($phone));

        return true;
    }

    private function key(string $phone): string
    {
        return 'otp:'.$phone;
    }
}
