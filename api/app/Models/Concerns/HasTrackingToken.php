<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Support\TrackingToken;

/**
 * Every citizen-facing submission gets its public tracking token at creation — here rather than
 * in the controller, because seeds, factories and the offline sync create rows too and a row
 * without a token cannot be looked up or quoted back to the citizen.
 *
 * The model names its prefix in a `$trackingPrefix` property (e.g. 'SUR-APT').
 */
trait HasTrackingToken
{
    public static function bootHasTrackingToken(): void
    {
        static::creating(function ($model) {
            $model->tracking_token ??= TrackingToken::generate($model->trackingPrefix, $model->getTable());
        });
    }
}
