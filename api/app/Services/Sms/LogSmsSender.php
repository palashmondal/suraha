<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

// Default SMS driver for local/dev: logs the message instead of sending. The real gateway driver
// (e.g. an HTTP client to the SMS provider) implements the same interface and is selected by config.
class LogSmsSender implements SmsSender
{
    public function send(string $mobile, string $message): void
    {
        Log::channel(config('logging.default'))->info('[SMS:mock] to '.$mobile.': '.$message);
    }
}
