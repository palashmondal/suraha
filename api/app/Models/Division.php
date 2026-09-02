<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Division (বিভাগ) — top tier of the administrative hierarchy (বিভাগ → জেলা → উপজেলা).
 * Shared registry; there are eight and they effectively never change.
 */
class Division extends Model
{
    protected $fillable = ['name', 'name_bn'];

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }
}
