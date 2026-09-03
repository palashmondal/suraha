<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Districts (জেলা) — shared registry, NOT tenant-scoped. A DC oversees all upazilas within
 * one district. Dated before the tenants table so upazilas can reference it. See §4.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->string('name');       // e.g. "Barishal"
            $table->string('name_bn');    // e.g. "বরিশাল"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
