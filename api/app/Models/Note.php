<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * One dated note an officer kept on a case — meeting outcome, follow-up instruction, or anything
 * else worth remembering. Rendered as a timeline on the record's detail page.
 *
 * Polymorphic: সাক্ষাৎকার, মানবিক সহায়তা and নাগরিক পরামর্শ all take notes, and the note itself is
 * the same thing in each. Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class Note extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    public function notable(): MorphTo
    {
        return $this->morphTo();
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
