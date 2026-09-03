<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * One step in a complaint's history (§8.4): filed, accepted (officer appointed), rejected, report
 * (officer's investigation report), hearing_scheduled, reinvestigation, completed. Rendered as the
 * complaint detail timeline. Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class ComplaintEvent extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id', 'tenant_id'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ComplaintAttachment::class);
    }

    /** Bangla step label for the timeline. */
    public function labelBn(): string
    {
        return match ($this->type) {
            'filed' => 'অভিযোগ দাখিল',
            'accepted' => 'তদন্ত কর্মকর্তা নিযুক্ত',
            'rejected' => 'অভিযোগ বাতিল',
            'report' => 'তদন্ত প্রতিবেদন জমা',
            'hearing_scheduled' => 'শুনানির তারিখ নির্ধারিত',
            'reinvestigation' => 'পুনঃতদন্তের নির্দেশ',
            'completed' => 'নিষ্পত্তি সম্পন্ন',
            default => $this->type,
        };
    }
}
