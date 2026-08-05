<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Birth-registration state (জন্ম নিবন্ধন, §8.2). A record is created কার্যকর কিন্তু এন্ট্রি হয়নি
 * (PENDING_ENTRY) and becomes এন্ট্রি হয়েছে (ENTERED) once BDRIS returns a registration number.
 */
enum BirthRegStatus: string
{
    case PENDING_ENTRY = 'pending_entry'; // এন্ট্রি হয়নি
    case ENTERED = 'entered';             // এন্ট্রি হয়েছে

    public function labelBn(): string
    {
        return match ($this) {
            self::PENDING_ENTRY => 'এন্ট্রি হয়নি',
            self::ENTERED => 'এন্ট্রি হয়েছে',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PENDING_ENTRY => 'pending', // amber
            self::ENTERED => 'success',        // green
        };
    }
}
