<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

/**
 * Upazila (উপজেলা) — the Suraha tenant. Resolved from the request subdomain via the
 * `domains` map (e.g. galachipa.suraha.net). Lives in the central database; tenant-owned
 * rows reference it by `tenant_id`. See SURAHA_BUILD_PROMPT §4.
 *
 * @property string $id
 * @property string $name
 * @property string $name_bn
 * @property int $district_id
 * @property bool $is_active
 */
class Upazila extends BaseTenant
{
    use HasDomains;

    /**
     * Real DB columns (everything else stancl would fold into the `data` JSON blob).
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'name_bn',
            'district_id',
            'is_active',
        ];
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function unions(): HasMany
    {
        return $this->hasMany(Union::class, 'tenant_id');
    }
}
