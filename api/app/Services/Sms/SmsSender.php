<?php

namespace App\Services\Sms;

// SMS gateway behind a swappable interface (SURAHA_BUILD_PROMPT §8, §1.1(4)). SMS is used SOLELY to
// deliver login/registration OTPs — never for status notifications. A self-hosted upazila can bind its
// own driver via config (services.sms.driver) without touching call sites.
interface SmsSender
{
    public function send(string $mobile, string $message): void;
}
