<?php

declare(strict_types=1);

namespace App\Enums;

/** What an applicant is asking for. Drives the listing filter and the public form's dropdown. */
enum AssistanceKind: string
{
    case FINANCIAL = 'financial';
    case MEDICAL = 'medical';
    case EDUCATION = 'education';
    case DISASTER = 'disaster';
    case FOOD = 'food';
    case OTHER = 'other';

    public function labelBn(): string
    {
        return match ($this) {
            self::FINANCIAL => 'আর্থিক সহায়তা',
            self::MEDICAL => 'চিকিৎসা সহায়তা',
            self::EDUCATION => 'শিক্ষা সহায়তা',
            self::DISASTER => 'দুর্যোগ সহায়তা',
            self::FOOD => 'খাদ্য সহায়তা',
            self::OTHER => 'অন্যান্য',
        };
    }

    /** @return array<int, array{value:string,label:string}> */
    public static function options(): array
    {
        return array_map(fn (self $k) => ['value' => $k->value, 'label' => $k->labelBn()], self::cases());
    }
}
