<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One of the 491 upazilas of Bangladesh, as a pickable option. Distinct from Upazila, which is a
 * provisioned tenant — this is the catalogue SEAL chooses from.
 */
class UpazilaRef extends Model
{
    protected $fillable = ['district_id', 'name', 'name_bn', 'slug', 'gov_url'];

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}
