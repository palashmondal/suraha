<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Upazila;
use Illuminate\Console\Command;

/**
 * Every Suraha hostname, one per line: each provisioned upazila's subdomain plus each district
 * that has one (the DC dashboards). `scripts/dev.sh` feeds this into /etc/hosts, which has no
 * wildcards — it used to read the SQLite file with sqlite3, which stopped being possible when the
 * dev database moved to Postgres.
 */
class ListHosts extends Command
{
    protected $signature = 'suraha:hosts';

    protected $description = 'List every upazila and district subdomain label (one per line).';

    public function handle(): int
    {
        $labels = Upazila::query()->pluck('id')
            ->merge(District::whereNotNull('slug')->whereHas('upazilas')->pluck('slug'))
            ->unique()
            ->filter();

        foreach ($labels as $label) {
            $this->line((string) $label);
        }

        return self::SUCCESS;
    }
}
