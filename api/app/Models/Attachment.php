<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/** One citizen-supplied file on a complaint / assistance / suggestion. Tenant-scoped. */
#[ScopedBy(VisibleTenantScope::class)]
class Attachment extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function url(): string
    {
        // Relative (same-origin) so the browser loads it from the current host over the same
        // scheme — /storage is routed to Laravel (see infra/Caddyfile*).
        return '/storage/'.$this->path;
    }
}
