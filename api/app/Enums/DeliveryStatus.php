<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Delivery state of a pregnancy record (প্রসূতি) — drives the list tabs and the detail-panel
 * status control (SURAHA_BUILD_PROMPT §8.1). A record starts NOT_DELIVERED; the FWA sets
 * DELIVERED (with the post-delivery fields) which then flows to the Sochib for BDRIS approval.
 */
enum DeliveryStatus: string
{
    case NOT_DELIVERED = 'not_delivered'; // ডেলিভারী হয়নি
    case DELIVERED = 'delivered';         // ডেলিভারি হয়েছে

    public function labelBn(): string
    {
        return match ($this) {
            self::NOT_DELIVERED => 'ডেলিভারী হয়নি',
            self::DELIVERED => 'ডেলিভারি হয়েছে',
        };
    }

    /** Status-pill tone (matches the web StatusPill tones). */
    public function tone(): string
    {
        return match ($this) {
            self::NOT_DELIVERED => 'danger',  // red — not yet delivered
            self::DELIVERED => 'success',      // green — delivered
        };
    }
}
