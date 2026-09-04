<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * One dated note the UNO kept on a সাক্ষাৎকার (§8.3) — meeting outcome, follow-up instruction,
 * or anything else worth remembering. Rendered as a timeline on the appointment detail page.
 * Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class AppointmentNote extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
