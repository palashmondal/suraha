<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Union;
use App\Models\Upazila;
use Illuminate\Http\Request;

/**
 * Read-only registry lookups used by public forms and the upazila switcher: the current
 * upazila's unions, and (for cross-tenant roles) the list of upazilas they may switch into.
 */
class RegistryController extends Controller
{
    /**
     * Host context for the requesting subdomain — lets the SPA render the right shell without
     * guessing district-vs-upazila from the hostname string:
     *  - central host (suraha.com.bd)        → { kind: 'central' }
     *  - upazila host ({upazila}.suraha…)     → { kind: 'upazila', slug, name_bn }
     * (A 'district' kind is a deferred TODO — see the platform plan.)
     */
    public function hostContext()
    {
        if (! tenancy()->initialized) {
            return response()->json(['kind' => 'central', 'slug' => null, 'name_bn' => null]);
        }

        $upazila = tenant()->load('district');

        return response()->json([
            'kind' => 'upazila',
            'slug' => $upazila->getTenantKey(),
            'name_bn' => $upazila->name_bn,
            'district_bn' => $upazila->district?->name_bn,
        ]);
    }

    /** Current upazila context (resolved from subdomain), or null on a central domain. */
    public function currentUpazila()
    {
        if (! tenancy()->initialized) {
            return response()->json(['upazila' => null]);
        }

        $upazila = tenant()->load('district');

        return response()->json([
            'upazila' => [
                'id' => $upazila->id,
                'name' => $upazila->name,
                'name_bn' => $upazila->name_bn,
                'district' => $upazila->district?->name_bn,
            ],
        ]);
    }

    /** Unions/pourashavas of the current upazila (tenant-scoped). */
    public function unions()
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        return response()->json([
            'unions' => Union::orderBy('name_bn')->get(['id', 'name', 'name_bn', 'type', 'ward_count']),
        ]);
    }

    /**
     * Upazilas the authenticated user may switch into (SEAL: all; DC: own district).
     */
    public function switchableUpazilas(Request $request)
    {
        $user = $request->user();

        $query = Upazila::query()->with('district')->where('is_active', true);

        if ($user->role->scope() === 'district') {
            $query->where('district_id', $user->district_id);
        } elseif ($user->role->scope() !== 'global') {
            $query->whereKey($user->tenant_id);
        }

        return response()->json([
            'upazilas' => $query->orderBy('name_bn')->get()->map(fn (Upazila $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'name_bn' => $u->name_bn,
                'district' => $u->district?->name_bn,
            ]),
        ]);
    }

    /** All districts (registry). */
    public function districts()
    {
        return response()->json([
            'districts' => District::orderBy('name_bn')->get(['id', 'name', 'name_bn']),
        ]);
    }

    /**
     * Public directory of active upazilas for the FWA mobile app's first-run picker. The app has
     * no subdomain yet, so it calls this on the central host, then pins its API base to the chosen
     * upazila's subdomain. Returns the subdomain slug + Bangla names.
     */
    public function upazilaDirectory()
    {
        $upazilas = Upazila::query()
            ->where('is_active', true)
            ->with('district')
            ->orderBy('name_bn')
            ->get();

        return response()->json([
            'upazilas' => $upazilas->map(fn (Upazila $u) => [
                'slug' => $u->getTenantKey(),
                'name_bn' => $u->name_bn,
                'district_bn' => $u->district?->name_bn,
            ]),
        ]);
    }
}
