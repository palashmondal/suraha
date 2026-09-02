<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Division;
use Illuminate\Database\Seeder;

/**
 * The eight divisions (বিভাগ) of Bangladesh. Idempotent, keyed on the English name, so it is
 * safe to run against a live database. Must run before DistrictSeeder, which links each
 * district to its division.
 */
class DivisionSeeder extends Seeder
{
    /** [English, Bangla]. */
    public const DIVISIONS = [
        ['Barishal', 'বরিশাল'],
        ['Chattogram', 'চট্টগ্রাম'],
        ['Dhaka', 'ঢাকা'],
        ['Khulna', 'খুলনা'],
        ['Mymensingh', 'ময়মনসিংহ'],
        ['Rajshahi', 'রাজশাহী'],
        ['Rangpur', 'রংপুর'],
        ['Sylhet', 'সিলেট'],
    ];

    public function run(): void
    {
        foreach (self::DIVISIONS as [$name, $nameBn]) {
            Division::firstOrCreate(['name' => $name], ['name_bn' => $nameBn]);
        }
    }
}
