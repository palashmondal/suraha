<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One attempted SMS. The provider reports a balance but not what Suraha spent it on, so the
 * usage figures on the SMS সেটিংস page come from here. Central, not tenant-scoped: OTPs are sent
 * before anyone has logged in, so there is no tenant to attribute them to.
 */
class SmsMessage extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['sent' => 'boolean'];
    }

    /** Bangla is Unicode, so a part is 70 characters, not 160. */
    public static function partsFor(string $message): int
    {
        $unicode = preg_match('/[^\x20-\x7E]/', $message) === 1;
        $per = $unicode ? 70 : 160;

        return max(1, (int) ceil(mb_strlen($message) / $per));
    }

    public function labelBn(): string
    {
        return match ($this->purpose) {
            'otp' => 'লগইন ওটিপি',
            'appointment' => 'সাক্ষাৎকার',
            'complaint' => 'অভিযোগ',
            'suggestion' => 'নাগরিক পরামর্শ',
            'test' => 'পরীক্ষামূলক',
            default => $this->purpose,
        };
    }
}
