<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Appointment (সাক্ষাৎকার, §8.3) state: a request is অপেক্ষমান until the UNO approves or rejects it
 * (a reschedule keeps it pending with new date/time).
 */
enum AppointmentStatus: string
{
    case PENDING = 'pending';   // অপেক্ষমান
    case APPROVED = 'approved'; // অনুমোদিত
    case REJECTED = 'rejected'; // নাকচ

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
            self::PENDING => 'pending',   // amber
            self::APPROVED => 'success',  // green
            self::REJECTED => 'danger',   // red
        };
    }
}
