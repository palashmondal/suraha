<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// District registry (SURAHA_OVERVIEW §8). A DC oversees all upazilas within one district.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->id();
            $table->string('name');        // Bangla display name, e.g. বরিশাল
            $table->string('name_en')->nullable();
            $table->string('code')->unique(); // short slug, e.g. barisal
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
