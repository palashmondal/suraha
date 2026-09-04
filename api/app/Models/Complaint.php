<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ComplaintStatus;
use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use App\Models\Concerns\HasAttachments;
use App\Models\Concerns\HasTrackingToken;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * অভিযোগ record (§8.4). Tenant-scoped. The step-by-step history (appointment, report, hearing,
 * order, re-investigation) lives in complaint_events and feeds the detail timeline; the complaint
 * row keeps the current status + officer + due/hearing dates for listing and the UNO schedule.
 */
#[ScopedBy(VisibleTenantScope::class)]
class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use BelongsToTenant, HasAttachments, HasFactory, HasTrackingToken;

    protected $trackingPrefix = 'SUR-CMP';

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => ComplaintStatus::class,
            // decimal columns come back as strings, so the JSON carried "90.1294100" and any
            // arithmetic on the client (the map bbox) produced NaN — which OSM renders as the
            // whole world. The API's own type says number; this makes that true.
            'latitude' => 'float',
            'longitude' => 'float',
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
        // By id, not created_at: several steps can land in the same second (and the seeders
        // backdate whole timelines to one moment), where a created_at sort leaves the order
        // among ties up to the database.
        return $this->hasMany(ComplaintEvent::class)->oldest('id');
    }

    /**
     * What the status pill reads. A scheduled hearing is a stage past "তদন্ত কর্মকর্তা নিযুক্ত",
     * but not a status of its own — `status` stays ASSIGNED through the report → hearing → order
     * steps — so the wording is derived here rather than stored. Matches the তালিকা's
     * শুনানি নির্ধারিত tab, which selects on exactly the same condition.
     */
    public function hearingSet(): bool
    {
        return $this->status === ComplaintStatus::ASSIGNED && $this->hearing_date !== null;
    }

    public function statusLabelBn(): string
    {
        return $this->hearingSet() ? 'শুনানি তারিখ নির্ধারিত' : $this->status->labelBn();
    }

    public function statusTone(): string
    {
        return $this->hearingSet() ? 'pending' : $this->status->tone();
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    /** The owning upazila — a column in the তালিকা, and the only way to tell rows apart in the
     *  SEAL/DC aggregate view where they mix. */
    public function upazila(): BelongsTo
    {
        return $this->belongsTo(Upazila::class, 'tenant_id');
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
