<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unions / Pourashavas (ইউনিয়ন / পৌরসভা) belonging to an upazila (tenant). Part of the shared
 * registry but tenant-owned: scoped by tenant_id so an upazila only sees its own unions.
 * Wards are captured as a simple count per union (ward numbers are entered on records).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name');       // e.g. "Golachipa Sadar"
            $table->string('name_bn');    // e.g. "গলাচিপা সদর"
            $table->string('type')->default('union'); // union | pourashava
            $table->unsignedTinyInteger('ward_count')->default(9);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unions');
    }
};
