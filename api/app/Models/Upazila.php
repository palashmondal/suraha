<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// The tenant. Resolved from the request subdomain (SURAHA_BUILD_PROMPT §12).
class Upazila extends Model
{
    protected $fillable = ['district_id', 'name', 'name_en', 'subdomain', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<District, $this> */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** Display label used across the UI, e.g. "গলাচিপা উপজেলা, বরিশাল". */
    public function displayName(): string
    {
        return $this->district
            ? "{$this->name}, {$this->district->name}"
            : $this->name;
    }
}
