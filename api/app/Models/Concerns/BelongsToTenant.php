<?php

namespace App\Models\Concerns;

use App\Models\Upazila;
use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Tenant scoping for module models (complaints, appointments, pregnancies…). Applying this trait
// auto-fills upazila_id on create and constrains queries to the resolved tenant, so a module can never
// leak rows across upazilas (SURAHA_BUILD_PROMPT §3, §10). Cross-tenant roles (DC/SEAL) opt out of the
// query constraint explicitly via withoutTenantScope(); writes still stamp the active tenant.
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $upazilaId = Tenant::id();
            if ($upazilaId !== null && ! Tenant::isCrossTenant()) {
                $builder->where($builder->getModel()->getTable().'.upazila_id', $upazilaId);
            }
        });

        static::creating(function ($model) {
            if ($model->upazila_id === null) {
                $model->upazila_id = Tenant::id();
            }
        });
    }

    public function scopeWithoutTenantScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }

    /** @return BelongsTo<Upazila, $this> */
    public function upazila(): BelongsTo
    {
        return $this->belongsTo(Upazila::class);
    }
}
