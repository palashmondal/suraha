<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\GeneralInfoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Scopes\VisibleTenantScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

/**
 * General Info item (§8.6) — a phone number or an about-upazila entry. Tenant-scoped.
 */
#[ScopedBy(VisibleTenantScope::class)]
class GeneralInfo extends Model
{
    /** @use HasFactory<GeneralInfoFactory> */
    use BelongsToTenant, HasFactory;

    protected $table = 'general_infos';

    protected $guarded = ['id', 'tenant_id'];
}
