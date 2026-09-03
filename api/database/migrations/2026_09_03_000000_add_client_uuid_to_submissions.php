<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency key for offline citizen submissions, mirroring pregnancies: a client-generated UUID lets
 * a retried "create" after a flaky connection resolve to the same row instead of duplicating it. The
 * PWA's offline outbox replays each queued write with its client_uuid (web/src/offline/). Unique per
 * tenant so the same UUID can exist across upazilas.
 */
return new class extends Migration
{
    private const TABLES = ['complaints', 'appointments', 'assistances', 'suggestions'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->uuid('client_uuid')->nullable()->after('id');
                $t->unique(['tenant_id', 'client_uuid']);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropUnique(['tenant_id', 'client_uuid']);
                $t->dropColumn('client_uuid');
            });
        }
    }
};
