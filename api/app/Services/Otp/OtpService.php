<?php

namespace App\Services\Otp;

use App\Models\OtpCode;
use App\Services\Sms\SmsSender;
use Illuminate\Support\Facades\Hash;

// Citizen login OTP lifecycle (SURAHA_BUILD_PROMPT §1.1(3)). Codes are hashed at rest, single-use,
// short-lived, and attempt-limited. Delivery goes through the SmsSender adapter (OTP only, §1.1(4)).
class OtpService
{
    public function __construct(private SmsSender $sms) {}

    /** Generate a fresh code for a mobile, invalidating any prior unconsumed codes, and send it. */
    public function issue(string $mobile): void
    {
        // Retire outstanding codes for this number so only the newest is valid.
        OtpCode::where('mobile', $mobile)->whereNull('consumed_at')->delete();

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        OtpCode::create([
            'mobile' => $mobile,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addSeconds((int) config('suraha.otp.ttl', 300)),
        ]);

        $this->sms->send($mobile, "আপনার সুরাহা যাচাই কোড: {$code}");
    }

    /** Verify a submitted code. Returns true and consumes the code on success. */
    public function verify(string $mobile, string $code): bool
    {
        // Dev bypass: a configured fixed code always verifies, so QA can log in without a live gateway.
        // Never set SURAHA_OTP_BYPASS in production.
        $bypass = $this->bypassCode();
        if ($bypass !== null && hash_equals($bypass, $code)) {
            OtpCode::where('mobile', $mobile)->whereNull('consumed_at')->update(['consumed_at' => now()]);

            return true;
        }

        $otp = OtpCode::where('mobile', $mobile)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        if (! $otp || $otp->isExpired()) {
            return false;
        }

        if ($otp->attempts >= (int) config('suraha.otp.max_attempts', 5)) {
            return false;
        }

        $otp->increment('attempts');

        if (! Hash::check($code, $otp->code_hash)) {
            return false;
        }

        $otp->forceFill(['consumed_at' => now()])->save();

        return true;
    }

    /** Dev convenience: a fixed code when configured, so QA can log in without a live SMS gateway. */
    public function bypassCode(): ?string
    {
        $code = config('suraha.otp.bypass_code');

        return $code ? (string) $code : null;
    }
}
