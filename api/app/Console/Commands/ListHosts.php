<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Upazila;
use Illuminate\Console\Command;

/**
 * Every Suraha subdomain label, one per line: the admin console, each provisioned upazila, and
 * each district that has one (the DC dashboards). `scripts/dev.sh` feeds this into /etc/hosts,
 * which has no wildcards — it used to read the SQLite file with sqlite3, which stopped being
 * possible when the dev database moved to Postgres.
 */
class ListHosts extends Command
{
    protected $signature = 'suraha:hosts';

    protected $description = 'List every Suraha subdomain label — admin, upazilas, districts (one per line).';

    public function handle(): int
    {
        $labels = collect($this->adminLabels())
            ->merge(Upazila::query()->pluck('id'))
            ->merge(District::whereNotNull('slug')->whereHas('upazilas')->pluck('slug'))
            ->unique()
            ->filter();

        foreach ($labels as $label) {
            $this->line((string) $label);
        }

        return self::SUCCESS;
    }

    /**
     * The single label in front of the base domain for each configured admin host — "admin" for
     * admin.suraha.net. Derived rather than hardcoded so adding an admin host in config reaches
     * /etc/hosts without editing the dev script too.
     *
     * @return list<string>
     */
    private function adminLabels(): array
    {
        $suffix = '.'.config('tenancy.base_domain');

        return array_values(array_filter(array_map(
            fn (string $host) => str_ends_with($host, $suffix)
                ? substr($host, 0, -strlen($suffix))
                : null,
            (array) config('tenancy.admin_domains', []),
        )));
    }
}
