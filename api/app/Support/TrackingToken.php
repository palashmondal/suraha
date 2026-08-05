<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Generates human-friendly, unique public tracking tokens like SUR-CMP-7K2P9Q. Uses an
 * unambiguous charset (no O/0/I/1) so citizens can read/type them from a printout or SMS.
 */
final class TrackingToken
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public static function generate(string $prefix, string $table): string
    {
        do {
            $token = $prefix.'-'.self::random(6);
        } while (DB::table($table)->where('tracking_token', $token)->exists());

        return $token;
    }

    private static function random(int $length): string
    {
        $out = '';
        $max = strlen(self::ALPHABET) - 1;
        for ($i = 0; $i < $length; $i++) {
            $out .= self::ALPHABET[random_int(0, $max)];
        }

        return $out;
    }
}
