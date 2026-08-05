<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Complaint lifecycle (অভিযোগ, §8.4): দাখিল → শিডিউল যুক্ত → তদন্তকারী নিযুক্ত → নিষ্পত্তি, or নাকচ.
 * Drives the list tabs, the status pill, and the detail timeline.
 */
enum ComplaintStatus: string
{
    case FILED = 'filed';         // নিষ্পত্তিহীন (just filed)
    case SCHEDULED = 'scheduled'; // শিডিউল যুক্ত
    case ASSIGNED = 'assigned';   // তদন্ত কর্মকর্তা যুক্ত (under investigation)
    case RESOLVED = 'resolved';   // নিষ্পত্তি সম্পন্ন
    case REJECTED = 'rejected';   // নাকচ

    public function labelBn(): string
    {
        return match ($this) {
            self::FILED => 'নিষ্পত্তিহীন',
            self::SCHEDULED => 'শিডিউল যুক্ত',
            self::ASSIGNED => 'তদন্তকারী যুক্ত',
            self::RESOLVED => 'নিষ্পত্তি সম্পন্ন',
            self::REJECTED => 'নাকচ',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::FILED => 'pending',    // amber
            self::SCHEDULED => 'info',    // violet/blue
            self::ASSIGNED => 'info',
            self::RESOLVED => 'success',  // green
            self::REJECTED => 'danger',   // red
        };
    }
}
