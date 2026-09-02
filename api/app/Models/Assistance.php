<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AssistanceKind;
use App\Enums\AssistanceStatus;
use Database\Factories\AssistanceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/** মানবিক সহায়তা application. Tenant-scoped. */
class Assistance extends Model
{
    /** @use HasFactory<AssistanceFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => AssistanceStatus::class,
            'kind' => AssistanceKind::class,
            'decided_at' => 'datetime',
        ];
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(User::class, 'citizen_id');
    }
}
