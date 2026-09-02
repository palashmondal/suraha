<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One of the 4,567 unions of Bangladesh, as reference data. Copied into an upazila's own
 * `unions` when that upazila is provisioned — see Union, which is the tenant-owned record
 * everything else points at.
 */
class UnionRef extends Model
{
    protected $fillable = ['upazila_ref_id', 'name', 'name_bn'];

    public function upazilaRef(): BelongsTo
    {
        return $this->belongsTo(UpazilaRef::class);
    }
}
