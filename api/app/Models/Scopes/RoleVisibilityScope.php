<?php

declare(strict_types=1);

namespace App\Models\Scopes;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Within-upazila visibility (§3). BelongsToTenant already narrows every query to one upazila; this
 * narrows it further for the two roles whose remit is a slice of it:
 *
 *   - **FWA** works a caseload, not a register: only the প্রসূতি records they entered themselves.
 *   - **ইউপি সচিব** serves one union: only records filed under their `union_id`.
 *
 * UNO / DC / SEAL keep the whole upazila. Applied as a global scope so it holds on every read path
 * at once — list, tab counts, search, route-model binding (an out-of-scope id 404s), the
 * certificate download and the approve action — rather than being re-derived per controller.
 *
 * Unauthenticated contexts (seeders, console, the BDRIS gateway) are unscoped by design.
 *
 * @param string|null $fwaOwnershipColumn Column carrying "the FWA who entered this", or null when
 *        the model is not something an FWA enters — a জন্ম নিবন্ধন is filed by the সচিব, so an
 *        ownership filter there would hide the FWA's own mother's registration number from her.
 */
class RoleVisibilityScope implements Scope
{
    public function __construct(private ?string $fwaOwnershipColumn = 'created_by') {}

    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        if (! $user) {
            return;
        }

        $table = $model->getTable();

        match ($user->role) {
            Role::FWA => $this->fwaOwnershipColumn
                ? $builder->where("{$table}.{$this->fwaOwnershipColumn}", $user->id)
                : null,
            // A সচিব with no union on file would otherwise see the whole upazila; scope to nothing
            // instead, and fix the account rather than leaking the register.
            Role::UP_SOCHIB => $builder->where("{$table}.union_id", $user->union_id),
            default => null,
        };
    }
}
