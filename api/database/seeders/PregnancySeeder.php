<?php

namespace Database\Seeders;

use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample প্রসূতি data for development so the module has real rows to render. Seeds Golachipa with
 * a mix of not-delivered and delivered mothers, spread across the upazila's unions/wards and
 * attributed to the seeded FWA. Runs within the tenant context so tenant_id auto-fills.
 */
class PregnancySeeder extends Seeder
{
    public function run(): void
    {
        $golachipa = Upazila::find('golachipa');
        if (! $golachipa) {
            return;
        }

        $fwa = User::where('username', 'fwa_golachipa')->first();

        tenancy()->initialize($golachipa);

        $unionIds = Union::pluck('id')->all();
        // state() closure runs per-record, so each mother lands in a random union.
        $attrs = fn () => [
            'union_id' => $unionIds ? $unionIds[array_rand($unionIds)] : null,
            'created_by' => $fwa?->id,
        ];

        // 12 not yet delivered, 6 delivered.
        Pregnancy::factory()->count(12)->state($attrs)->create();
        Pregnancy::factory()->count(6)->delivered()->state($attrs)->create();

        tenancy()->end();
    }
}
