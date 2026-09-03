<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Model;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * In-app notification (§9). Tenant-scoped; targeted at a single role. Created via push() from the
 * module controllers when a citizen/FWA files something the office needs to see.
 */
class Notification extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    /**
     * Emit a notification within the current tenant for a target role. No-op outside a tenant
     * context (e.g. a SEAL action on the central host).
     */
    public static function emit(string $type, Role $targetRole, string $title, ?string $detail = null, ?string $link = null): void
    {
        if (! tenancy()->initialized) {
            return;
        }

        static::create([
            'type' => $type,
            'target_role' => $targetRole->value,
            'title' => $title,
            'detail' => $detail,
            'link' => $link,
        ]);
    }
}
