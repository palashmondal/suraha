<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SuggestionKind;
use App\Enums\SuggestionStatus;
use Database\Factories\SuggestionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/** নাগরিক পরামর্শ. Tenant-scoped. */
#[ScopedBy(VisibleTenantScope::class)]
class Suggestion extends Model
{
    /** @use HasFactory<SuggestionFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => SuggestionStatus::class,
            'kind' => SuggestionKind::class,
            'is_confidential' => 'boolean',
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
