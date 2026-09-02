<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Divisions (বিভাগ) — the tier above districts in Bangladesh's administrative hierarchy
 * (বিভাগ → জেলা → উপজেলা). Shared registry, not tenant-scoped, like districts.
 *
 * division_id is nullable so this applies cleanly to a live database; DivisionSeeder +
 * DistrictSeeder backfill every existing district. Nothing reads it before it is populated.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('divisions', function (Blueprint $table) {
            $table->id();
            $table->string('name');       // e.g. "Barishal"
            $table->string('name_bn');    // e.g. "বরিশাল"
            $table->timestamps();
        });

        Schema::table('districts', function (Blueprint $table) {
            $table->foreignId('division_id')->nullable()->after('name_bn')->constrained();
        });
    }

    public function down(): void
    {
        Schema::table('districts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('division_id');
        });
        Schema::dropIfExists('divisions');
    }
};
