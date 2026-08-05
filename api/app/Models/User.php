<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'name_en', 'username', 'phone', 'email', 'password', 'role',
    'tenant_id', 'district_id', 'union_id', 'ward_no', 'designation', 'avatar_path', 'is_active',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'role' => Role::class,
        ];
    }

    // ---- Relationships ---------------------------------------------------

    public function upazila(): BelongsTo
    {
        return $this->belongsTo(Upazila::class, 'tenant_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    // ---- RBAC helpers (thin wrappers over the Role enum) -----------------

    public function hasRole(Role $role): bool
    {
        return $this->role === $role;
    }

    public function isReadOnly(): bool
    {
        return $this->role->isReadOnly();
    }

    public function isCrossTenant(): bool
    {
        return $this->role->isCrossTenant();
    }

    public function isOfficer(): bool
    {
        return $this->role->isOfficer();
    }

    /**
     * May this user act within the given upazila (tenant) id?
     *  - SEAL: any upazila
     *  - DC: any upazila in their district
     *  - everyone else: only their own upazila
     */
    public function canAccessTenant(?string $tenantId): bool
    {
        if ($tenantId === null) {
            return false;
        }

        return match ($this->role->scope()) {
            'global' => true,
            'district' => Upazila::query()
                ->whereKey($tenantId)
                ->where('district_id', $this->district_id)
                ->exists(),
            default => $this->tenant_id === $tenantId,
        };
    }
}
