<?php

namespace Database\Seeders;

use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample প্রসূতি data for development so the module has real rows to render. Seeds Galachipa with
 * a mix of not-delivered and delivered mothers, attributed to the seeded FWA and filed under that
 * FWA's own union — a FWA is posted to one union, and RoleVisibilityScope shows a সচিব only their
 * union's records, so records scattered across twelve unions left both roles staring at an almost
 * empty register. Wards still vary. Runs within the tenant context so tenant_id auto-fills.
 */
class PregnancySeeder extends Seeder
{
    public function run(): void
    {
        $galachipa = Upazila::find('galachipa');
        if (! $galachipa) {
            return;
        }

        $fwa = User::where('username', 'fwa_galachipa')->first();

        tenancy()->initialize($galachipa);

        $unionId = $fwa?->union_id ?? Union::value('id');
        $attrs = fn () => [
            'union_id' => $unionId,
            'created_by' => $fwa?->id,
        ];

        // 12 not yet delivered, 6 delivered.
        Pregnancy::factory()->count(12)->state($attrs)->create();
        Pregnancy::factory()->count(6)->delivered()->state($attrs)->create();

        tenancy()->end();
    }
}
