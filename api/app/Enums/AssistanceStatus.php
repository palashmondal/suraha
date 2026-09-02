<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * মানবিক সহায়তা application state: an application waits until the UNO approves or rejects it.
 * Mirrors the appointment lifecycle — one decision, no investigation step.
 */
enum AssistanceStatus: string
{
    case PENDING = 'pending';    // অপেক্ষমান
    case APPROVED = 'approved';  // অনুমোদিত
    case REJECTED = 'rejected';  // নাকচ

    public function labelBn(): string
    {
        return match ($this) {
            self::PENDING => 'অপেক্ষমান',
            self::APPROVED => 'অনুমোদিত',
            self::REJECTED => 'নাকচ',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PENDING => 'pending',
            self::APPROVED => 'success',
            self::REJECTED => 'danger',
        };
    }
}
