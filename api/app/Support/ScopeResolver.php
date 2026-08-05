<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Upazila;
use App\Models\User;

/**
 * Resolves the set of upazilas a request should aggregate over (§13.3 / §8.7): a single upazila
 * (a subdomain, or a switched X-Upazila), the DC's whole district, or SEAL's all. Shared by the
 * dashboard stats and the reporting endpoints so scoping stays consistent.
 */
class ScopeResolver
{
    /**
     * @return array{0: array<int,string>, 1: array{level:string,label:string,upazila_count:int}}
     */
    public static function resolve(User $user): array
    {
        // A resolved tenant (subdomain, or a switched X-Upazila) → that single upazila.
        if (tenancy()->initialized) {
            $upazila = tenant();

            return [[$upazila->getTenantKey()], [
                'level' => 'tenant',
                'label' => $upazila->name_bn,
                'upazila_count' => 1,
            ]];
        }

        // Console aggregate (SEAL/DC with no upazila selected).
        return match ($user->role->scope()) {
            'global' => [
                Upazila::where('is_active', true)->pluck('id')->all(),
                ['level' => 'global', 'label' => 'সকল উপজেলা', 'upazila_count' => Upazila::where('is_active', true)->count()],
            ],
            'district' => [
                Upazila::where('district_id', $user->district_id)->pluck('id')->all(),
                ['level' => 'district', 'label' => 'জেলার সকল উপজেলা', 'upazila_count' => Upazila::where('district_id', $user->district_id)->count()],
            ],
            default => [
                [$user->tenant_id],
                ['level' => 'tenant', 'label' => '', 'upazila_count' => 1],
            ],
        };
    }
}
