<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ComplaintStatus;
use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * অভিযোগ record (§8.4). Tenant-scoped. Lifecycle timestamps (created_at, scheduled_at,
 * assigned_at, resolved_at, rejected_at) feed the detail timeline.
 */
class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'filed',
    ];

    protected function casts(): array
    {
        return [
            'status' => ComplaintStatus::class,
            'complaint_date' => 'date',
            'schedule_date' => 'date',
            'scheduled_at' => 'datetime',
            'assigned_at' => 'datetime',
            'resolved_at' => 'datetime',
            'rejected_at' => 'datetime',
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

    public function investigatingOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'investigating_officer_id');
    }
}
