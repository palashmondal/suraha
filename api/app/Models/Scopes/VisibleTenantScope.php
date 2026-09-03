<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use App\Support\ScopeResolver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Which upazilas a request may see when **no** upazila is selected — the console's "সকল উপজেলা"
 * view on the central host.
 *
 * With a tenant resolved, stancl's BelongsToTenant scope already narrows every query to it. With
 * none, that scope stands down and the query sees every upazila in the country. Two things follow
 * from that, and this scope is both fixes:
 *
 *   - a SEAL/DC listing a module got no upazila filter at all — the controllers papered over it by
 *     refusing the request (400), which the web renders as "কোনো তথ্য নাই" on a page that should
 *     have aggregated;
 *   - and any other officer could read another upazila's record by id through the central host,
 *     because nothing was left to stop them.
 *
 * So: SEAL sees every upazila, a DC sees their district's, and everyone else sees only their own
 * `tenant_id`. ScopeResolver decides, exactly as the dashboards and reports already do.
 *
 * Unauthenticated contexts (seeders, console, BDRIS) are left alone.
 */
class VisibleTenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (tenancy()->initialized) {
            return; // BelongsToTenant has it
        }

        $user = auth()->user();

        if (! $user) {
            return;
        }

        [$tenantIds] = ScopeResolver::resolve($user);

        $builder->whereIn($model->getTable().'.tenant_id', $tenantIds);
    }
}
