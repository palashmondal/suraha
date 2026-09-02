<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reference list of all 4,567 unions of Bangladesh, keyed to the upazila catalogue.
 *
 * Distinct from `unions`, which is tenant-owned: officers, pregnancies, complaints and
 * appointments all carry a union_id pointing there, so that table stays per-upazila and is
 * populated from this catalogue when an upazila is provisioned.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('union_refs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('upazila_ref_id')->constrained()->cascadeOnDelete();
            $table->string('name');       // e.g. "Panpatty"
            $table->string('name_bn');    // e.g. "পানপট্টি"
            $table->timestamps();

            $table->unique(['upazila_ref_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('union_refs');
    }
};
