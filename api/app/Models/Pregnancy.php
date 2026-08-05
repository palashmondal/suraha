<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\DeliveryStatus;
use Database\Factories\PregnancyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * প্রসূতি কল্যাণ record (SURAHA_BUILD_PROMPT §8.1). Tenant-scoped via the BelongsToTenant global
 * scope, so a query only ever sees the current upazila's mothers.
 */
class Pregnancy extends Model
{
    /** @use HasFactory<PregnancyFactory> */
    use BelongsToTenant, HasFactory;

    protected $guarded = ['id', 'tenant_id'];

    // Ensures a newly created record has a status in memory (matches the DB default) so the
    // enum cast never resolves null before the row is reloaded.
    protected $attributes = [
        'delivery_status' => 'not_delivered',
    ];

    protected function casts(): array
    {
        return [
            'delivery_status' => DeliveryStatus::class,
            'chronic_diseases' => 'array',
            'last_tt_date' => 'date',
            'last_menstruation_date' => 'date',
            'expected_delivery_date' => 'date',
            'actual_delivery_date' => 'date',
            'height_inch' => 'float',
            'weight_kg' => 'float',
            'birth_weight_kg' => 'float',
            'birth_height_inch' => 'float',
            'emergency_transport' => 'boolean',
            'enough_money' => 'boolean',
            'blood_donor_arranged' => 'boolean',
            'mother_alive' => 'boolean',
            'newborn_alive' => 'boolean',
        ];
    }

    public function union(): BelongsTo
    {
        return $this->belongsTo(Union::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function birthRegistration(): HasOne
    {
        return $this->hasOne(BirthRegistration::class);
    }

    public function isDelivered(): bool
    {
        return $this->delivery_status === DeliveryStatus::DELIVERED;
    }
}
