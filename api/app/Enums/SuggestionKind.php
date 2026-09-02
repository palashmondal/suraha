<?php

declare(strict_types=1);

namespace App\Enums;

/** What a suggestion is about. */
enum SuggestionKind: string
{
    case DEVELOPMENT = 'development';
    case ROAD = 'road';
    case BRIDGE = 'bridge';
    case SCHOOL = 'school';
    case HEALTH = 'health';
    case WATER = 'water';
    case OTHER = 'other';

    public function labelBn(): string
    {
        return match ($this) {
            self::DEVELOPMENT => 'উপজেলা উন্নয়ন',
            self::ROAD => 'রাস্তা / সড়ক',
            self::BRIDGE => 'সেতু / কালভার্ট',
            self::SCHOOL => 'শিক্ষা প্রতিষ্ঠান',
            self::HEALTH => 'স্বাস্থ্যসেবা',
            self::WATER => 'পানি ও স্যানিটেশন',
            self::OTHER => 'অন্যান্য',
        };
    }

    /** @return array<int, array{value:string,label:string}> */
    public static function options(): array
    {
        return array_map(fn (self $k) => ['value' => $k->value, 'label' => $k->labelBn()], self::cases());
    }
}
