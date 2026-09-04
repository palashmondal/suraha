<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Appointment;
use App\Models\BirthRegistration;
use App\Models\Complaint;
use App\Models\Pregnancy;
use App\Models\User;
use App\Support\ScopeResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Per-role dashboard stats (§13.3 / §8 summary cards). Resolves the set of upazilas in scope —
 * a single upazila (subdomain or a switched X-Upazila), the DC's whole district, or SEAL's all —
 * then returns real counts across the modules. The frontend picks which cards to show per role.
 */
class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        [$tenantIds, $scope] = ScopeResolver::resolve($user);

        $in = fn ($query) => $query->withoutTenancy()->whereIn('tenant_id', $tenantIds);
        // Complaints for an investigating role (তদন্ত কর্মকর্তা or ইউপি সচিব) are scoped to
        // their own assignments — the same rule the listing applies.
        $complaints = fn () => $in(Complaint::query())
            ->when($user->role->canInvestigate(), fn ($q) => $q->where('investigating_officer_id', $user->id));
        $today = today();

        return response()->json([
            'scope' => $scope,
            'officers' => [
                'total' => User::whereIn('tenant_id', $tenantIds)->where('role', '!=', Role::CITIZEN->value)->count(),
                'fwa' => User::whereIn('tenant_id', $tenantIds)->where('role', Role::FWA->value)->count(),
                'sochib' => User::whereIn('tenant_id', $tenantIds)->where('role', Role::UP_SOCHIB->value)->count(),
                'investigators' => User::whereIn('tenant_id', $tenantIds)->where('role', Role::INVESTIGATING_OFFICER->value)->count(),
            ],
            'pregnancy' => [
                'today_new' => $in(Pregnancy::query())->whereDate('created_at', $today)->count(),
                'total' => $in(Pregnancy::query())->count(),
                'delivered' => $in(Pregnancy::query())->where('delivery_status', 'delivered')->count(),
            ],
            'birth' => [
                'today_new' => $in(BirthRegistration::query())->whereDate('created_at', $today)->count(),
                'total' => $in(BirthRegistration::query())->where('status', 'entered')->count(),
                'pending_entry' => $in(BirthRegistration::query())->where('status', 'pending_entry')->count(),
            ],
            'complaints' => [
                // Investigating officers only ever see complaints on their own desk.
                'total' => $complaints()->count(),
                'unresolved' => $complaints()->whereIn('status', ['pending', 'assigned'])->count(),
                'resolved' => $complaints()->where('status', 'completed')->count(),
            ],
            'appointments' => [
                'total' => $in(Appointment::query())->count(),
                'pending' => $in(Appointment::query())->where('status', 'pending')->count(),
                'approved' => $in(Appointment::query())->where('status', 'approved')->count(),
            ],
        ]);
    }

}
