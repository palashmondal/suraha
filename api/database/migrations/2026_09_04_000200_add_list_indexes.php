<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for the shape every list actually queries: tenant first (the global tenant scope), then
 * whatever narrows it, then `created_at` because every list is `latest()`.
 *
 * Two things made these necessary at once. Postgres — unlike the SQLite dev database that came
 * before — does **not** create an index for a foreign key, so `union_id` and `created_by` were
 * unindexed. And RoleVisibilityScope now filters every read by exactly those two columns, so an
 * FWA's or a সচিব's list was a sequential scan of the whole upazila. At 18 seeded rows that is
 * free; at a real upazila's caseload it is the page load.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->index(['tenant_id', 'created_at']);              // the list's sort
            $table->index(['tenant_id', 'created_by']);              // FWA → own entries
            $table->index(['tenant_id', 'union_id']);                // সচিব → own union
            $table->index(['tenant_id', 'delivery_status', 'created_at']); // the tab counts
        });

        Schema::table('birth_registrations', function (Blueprint $table) {
            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'union_id']);
            $table->index(['tenant_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'created_at']);
            $table->dropIndex(['tenant_id', 'created_by']);
            $table->dropIndex(['tenant_id', 'union_id']);
            $table->dropIndex(['tenant_id', 'delivery_status', 'created_at']);
        });

        Schema::table('birth_registrations', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'created_at']);
            $table->dropIndex(['tenant_id', 'union_id']);
            $table->dropIndex(['tenant_id', 'status', 'created_at']);
        });
    }
};
