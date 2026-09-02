<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\District;
use App\Models\UpazilaRef;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the pickable upazila catalogue from database/data/bd-upazilas.json.
 *
 * Source of truth is the national portal's official list — all 499 upazilas across 64 districts
 * and 8 divisions: https://bangladesh.gov.bd/views/upazila-list
 *
 * Each `slug` is the upazila's own gov.bd subdomain label (galachipa.patuakhali.gov.bd →
 * `galachipa`), qualified with the district where that label is not unique nationwide: every
 * district has a `sadar`, and Kaliganj appears in four. Using the government's own naming means
 * a Suraha subdomain matches the one citizens already know.
 *
 * Idempotent, keyed on slug, so it is safe to re-run on a live database. Runs after DistrictSeeder.
 */
class UpazilaRefSeeder extends Seeder
{
    public function run(): void
    {
        $districts = District::pluck('id', 'name');
        $rows = json_decode((string) file_get_contents(database_path('data/bd-upazilas.json')), true);

        $payload = [];
        foreach ($rows as $r) {
            if (! isset($districts[$r['district']])) {
                continue;   // a district renamed out from under the catalogue; skip, don't fail the seed
            }
            $payload[] = [
                'district_id' => $districts[$r['district']],
                'name' => $r['name'],
                'name_bn' => $r['name_bn'],
                'slug' => $r['slug'],
                'gov_url' => $r['gov_url'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Full replace rather than upsert: the JSON file is the authority, and a renamed upazila
        // would otherwise leave its old row behind as a selectable ghost. Nothing references this
        // table (tenants point at districts), so replacing it is safe.
        DB::transaction(function () use ($payload) {
            UpazilaRef::query()->delete();
            foreach (array_chunk($payload, 200) as $chunk) {
                UpazilaRef::insert($chunk);
            }
        });
    }
}
