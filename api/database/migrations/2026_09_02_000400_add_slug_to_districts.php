<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subdomain label for a district's DC dashboard: Patuakhali → patuakhali.suraha.net.
 *
 * District and upazila hosts share ONE subdomain namespace, so this label must not collide with
 * any upazila slug. Two upazilas would otherwise shadow a district — Faridpur (in Pabna) and
 * Sherpur (in Bogura) — so the catalogue qualifies those with their district instead. See
 * UpazilaRefSeeder and the DistrictHostTest that pins the namespace.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('districts', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name_bn');
        });
    }

    public function down(): void
    {
        Schema::table('districts', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn('slug');
        });
    }
};
