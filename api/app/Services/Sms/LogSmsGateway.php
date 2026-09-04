<?php

declare(strict_types=1);

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

/**
 * Development SMS gateway: writes the message to the application log instead of sending it,
 * so OTP flows are fully testable without real SMS credentials. Swap for a real adapter via
 * the `sms.gateway` config binding.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $phone, string $message, string $purpose = 'other'): void
    {
        Log::channel(config('sms.log_channel', 'stack'))
            ->info("[SMS→{$phone}] ({$purpose}) {$message}");
    }
}
