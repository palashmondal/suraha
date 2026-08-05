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
}
