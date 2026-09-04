<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AppointmentStatus;
use Database\Factories\AppointmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * সাক্ষাৎকার record (§8.3). Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class Appointment extends Model
{
    /** @use HasFactory<AppointmentFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'status' => AppointmentStatus::class,
            'appointment_date' => 'date',
            'decided_at' => 'datetime',
        ];
    }

    /**
     * স্থান — every সাক্ষাৎকার is at the UNO office of its own upazila; nothing else is ever the
     * venue, so it is derived rather than stored. One source for the SMS, the .ics feed and the UI.
     * Postal shape (office, upazila, district) so calendars geocode it and link it to Maps
     * themselves: "উপজেলা নির্বাহী অফিসারের কার্যালয়, ডুমুরিয়া, খুলনা".
     */
    public function officeBn(): string
    {
        $tenant = tenant();

        return implode(', ', array_filter([
            'উপজেলা নির্বাহী অফিসারের কার্যালয়',
            $tenant?->name_bn,
            $tenant?->district?->name_bn,
        ]));
    }

    /** Calendar event title: সাক্ষাতকার: মোশারফ — ভূমি সংক্রান্ত সমস্যা */
    public function calendarTitleBn(): string
    {
        return 'সাক্ষাতকার: '.$this->applicant_name.' — '.$this->purpose;
    }

    /** The UNO's running notes, oldest first — the detail page reads them as a timeline. */
    public function notes(): HasMany
    {
        return $this->hasMany(AppointmentNote::class)->oldest();
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
