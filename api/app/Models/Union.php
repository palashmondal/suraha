<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * Union / Pourashava (ইউনিয়ন / পৌরসভা) within an upazila. Tenant-scoped: the BelongsToTenant
 * global scope filters by the current upazila and auto-fills tenant_id on create.
 */
class Union extends Model
{
    use BelongsToTenant;

    protected $fillable = ['name', 'name_bn', 'type', 'ward_count'];

    protected function casts(): array
    {
        return [
            'ward_count' => 'integer',
        ];
    }

    public function upazila(): BelongsTo
    {
        return $this->belongsTo(Upazila::class, 'tenant_id');
    }
}
