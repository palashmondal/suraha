<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * District (জেলা) — shared registry. A DC oversees every upazila within one district.
 */
class District extends Model
{
    protected $fillable = ['name', 'name_bn'];

    public function upazilas(): HasMany
    {
        return $this->hasMany(Upazila::class);
    }
}
