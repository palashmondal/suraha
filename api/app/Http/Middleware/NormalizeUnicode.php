<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TransformsRequest;
use Normalizer;

/**
 * Fold every incoming string to Unicode NFC, and drop bytes that are not valid UTF-8 at all.
 *
 * Bangla has characters with two encodings: য় is either U+09DF or the sequence য + ় (U+09AF
 * U+09BC), ড়/ঢ় likewise. Both render identically, a Bangla keyboard usually emits the
 * precomposed one, and our seeded data holds the decomposed one — which is what NFC produces,
 * because those precomposed letters are composition exclusions. Postgres `ILIKE` compares bytes,
 * so searching ডুমুরিয়া found nothing while ডুমুরি (everything before the য়) found all 59 rows.
 * Normalising on the way in means what gets stored and what gets searched are always the same
 * shape, instead of depending on which keyboard typed it.
 *
 * Invalid UTF-8 is stripped in the same pass: Postgres rejects such a parameter outright
 * (SQLSTATE 22021) and the request dies as a 500 instead of an empty result.
 */
class NormalizeUnicode extends TransformsRequest
{
    protected function transform($key, $value)
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        // mb_convert_encoding drops malformed byte sequences rather than passing them to the DB.
        if (! mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }

        return Normalizer::isNormalized($value, Normalizer::FORM_C)
            ? $value
            : (Normalizer::normalize($value, Normalizer::FORM_C) ?: $value);
    }
}
