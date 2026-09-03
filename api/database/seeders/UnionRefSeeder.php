<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\UnionRef;
use App\Models\UpazilaRef;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds the union catalogue from database/data/bd-unions.json — 4,567 unions across 494 upazilas
 * (five have none, being wholly urban). Source: github.com/palashmondal/bdgeocode, joined to our
 * upazila catalogue on each upazila's gov.bd host, which matched all 499 exactly.
 *
 * Full replace, like UpazilaRefSeeder: the file is the authority, and a renamed union would
 * otherwise linger as a selectable ghost. Runs after UpazilaRefSeeder.
 */
class UnionRefSeeder extends Seeder
{
    public function run(): void
    {
        $upazilas = UpazilaRef::pluck('id', 'slug');
        $rows = json_decode((string) file_get_contents(database_path('data/bd-unions.json')), true);

        $payload = [];
        foreach ($rows as $r) {
            if (! isset($upazilas[$r['upazila']])) {
                continue;   // an upazila renamed out from under the catalogue; skip, don't fail
            }
            $payload[] = [
                'upazila_ref_id' => $upazilas[$r['upazila']],
                'name' => $r['name'],
                'name_bn' => $r['name_bn'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::transaction(function () use ($payload) {
            UnionRef::query()->delete();
            foreach (array_chunk($payload, 500) as $chunk) {
                UnionRef::insert($chunk);
            }
        });
    }
}
