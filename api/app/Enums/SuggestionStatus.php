<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * নাগরিক পরামর্শ state. A suggestion is not investigated or scheduled — the UNO reads it and
 * either takes it forward or sets it aside, with a note either way.
 */
enum SuggestionStatus: string
{
    case PENDING = 'pending';    // নতুন
    case ACCEPTED = 'accepted';  // গৃহীত
    case REJECTED = 'rejected';  // নাকচ

    public function labelBn(): string
    {
        return match ($this) {
            self::PENDING => 'নতুন',
            self::ACCEPTED => 'গৃহীত',
            self::REJECTED => 'নাকচ',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PENDING => 'pending',
            self::ACCEPTED => 'success',
            self::REJECTED => 'danger',
        };
    }
}
