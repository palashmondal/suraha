<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BirthRegStatus;
use Database\Factories\BirthRegistrationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\RoleVisibilityScope;
use App\Models\Scopes\VisibleTenantScope;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * জন্ম নিবন্ধন record (§8.2). Tenant-scoped; links back to the source pregnancy (§8.1).
 */
class BirthRegistration extends Model
{
    /** @use HasFactory<BirthRegistrationFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending_entry',
    ];

    protected static function booted(): void
    {
        // সচিব → only their union. No FWA ownership rule: the সচিব files these, and the FWA must
        // still be able to read the registration number that came back for her own mother.
        static::addGlobalScope(new VisibleTenantScope);
        static::addGlobalScope(new RoleVisibilityScope(fwaOwnershipColumn: null));
    }

    protected function casts(): array
    {
        return [
            'status' => BirthRegStatus::class,
            'date_of_birth' => 'date',
            'bdris_submitted_at' => 'datetime',
        ];
    }

    public function pregnancy(): BelongsTo
    {
        return $this->belongsTo(Pregnancy::class);
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isEntered(): bool
    {
        return $this->status === BirthRegStatus::ENTERED;
    }
}
