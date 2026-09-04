<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Complaint lifecycle (অভিযোগ, §8.4):
 *   দাখিল (pending) → UNO accepts & appoints an officer (assigned) → officer submits report →
 *   UNO schedules a hearing → UNO's order: সম্পন্ন (completed) or পুনঃতদন্ত (back to assigned),
 *   or the UNO বাতিল (rejected) at review. The report → hearing → order steps all happen while
 *   the status is ASSIGNED; the detailed history lives in complaint_events.
 *
 * Drives the list tabs, the status pill, and the detail timeline.
 */
enum ComplaintStatus: string
{
    case PENDING = 'pending';       // অপেক্ষমাণ — awaiting UNO review
    case ASSIGNED = 'assigned';     // তদন্ত কর্মকর্তা নিযুক্ত — under investigation / hearing
    case COMPLETED = 'completed';   // সম্পন্ন
    case REJECTED = 'rejected';     // বাতিল

    public function labelBn(): string
    {
        return match ($this) {
            self::PENDING => 'অপেক্ষমাণ',
            self::ASSIGNED => 'তদন্ত কর্মকর্তা নিযুক্ত',
            self::COMPLETED => 'সম্পন্ন',
            self::REJECTED => 'বাতিল',
        };
    }

    public function tone(): string
    {
        return match ($this) {
            self::PENDING => 'pending',    // amber
            self::ASSIGNED => 'info',      // violet/blue
            self::COMPLETED => 'success',  // green
            self::REJECTED => 'danger',    // red
        };
    }
}
