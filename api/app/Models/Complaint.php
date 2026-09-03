<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ComplaintStatus;
use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * অভিযোগ record (§8.4). Tenant-scoped. The step-by-step history (appointment, report, hearing,
 * order, re-investigation) lives in complaint_events and feeds the detail timeline; the complaint
 * row keeps the current status + officer + due/hearing dates for listing and the UNO schedule.
 */
class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => ComplaintStatus::class,
            'complaint_date' => 'date',
            'due_date' => 'date',
            'hearing_date' => 'date',
            'assigned_at' => 'datetime',
            'completed_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(ComplaintEvent::class)->oldest();
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    public function citizen(): BelongsTo
    {
        return $this->belongsTo(User::class, 'citizen_id');
    }

    public function investigatingOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investigating_officer_id');
    }
}
