<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Birth-registration state (জন্ম নিবন্ধন, §8.2). A record is created জন্মনিবন্ধন সম্পন্ন হয়নি
 * (PENDING_ENTRY) and becomes জন্মনিবন্ধন সম্পন্ন (ENTERED) once BDRIS returns a registration number.
 */
enum BirthRegStatus: string
{
    case PENDING_ENTRY = 'pending_entry'; // জন্মনিবন্ধন সম্পন্ন হয়নি
    case ENTERED = 'entered';             // জন্মনিবন্ধন সম্পন্ন

    public function labelBn(): string
    {
        return match ($this) {
            self::PENDING_ENTRY => 'জন্মনিবন্ধন সম্পন্ন হয়নি',
            self::ENTERED => 'জন্মনিবন্ধন সম্পন্ন',
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
