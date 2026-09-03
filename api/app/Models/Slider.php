<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SliderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * Public-awareness slider (§8.5). Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class Slider extends Model
{
    /** @use HasFactory<SliderFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected function casts(): array
    {
        return [
            'slide_date' => 'date',
            'is_active' => 'boolean',
        ];
    }
}
