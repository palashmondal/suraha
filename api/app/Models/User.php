<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'role',
        'username',
        'mobile',
        'email',
        'password',
        'designation',
        'upazila_id',
        'district_id',
        'is_active',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Upazila, $this> */
    public function upazila(): BelongsTo
    {
        return $this->belongsTo(Upazila::class);
    }

    /** @return BelongsTo<District, $this> */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function isOfficer(): bool
    {
        return $this->role->isOfficer();
    }

    /** Display scope string for the profile chip, e.g. "গলাচিপা উপজেলা, বরিশাল". */
    public function contextLabel(): ?string
    {
        if ($this->relationLoaded('upazila') || $this->upazila_id) {
            return $this->upazila?->displayName();
        }
        if ($this->relationLoaded('district') || $this->district_id) {
            return $this->district?->name;
        }

        return null;
    }
}
