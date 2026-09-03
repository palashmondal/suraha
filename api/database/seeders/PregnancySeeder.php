<?php

namespace Database\Seeders;

use App\Models\Pregnancy;
use App\Models\Union;
use App\Models\Upazila;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample প্রসূতি data for development so the module has real rows to render. Seeds Galachipa with
 * a mix of not-delivered and delivered mothers, spread across the upazila's unions/wards and
 * attributed to the seeded FWA. Runs within the tenant context so tenant_id auto-fills.
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
