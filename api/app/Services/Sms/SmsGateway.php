<?php

declare(strict_types=1);

namespace App\Services\Sms;

/**
 * Swappable SMS gateway (SURAHA_BUILD_PROMPT §10). Used SOLELY to deliver login/registration
 * OTPs — never for status notifications (those are in-app only, §1.1(4)). A real provider
 * (e.g. an SSL Wireless / bulk-SMS adapter) implements this; LogSmsGateway stands in during
 * development until SEAL provisions credentials.
 */
interface SmsGateway
{
    public function send(string $phone, string $message): void;
}
