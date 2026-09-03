<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The husband's name in English, alongside the mother's. The জন্ম নিবন্ধন সনদ prints both parents
 * in Bangla and English; without this the সচিব had to transliterate the father's name by hand on
 * every certificate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->string('husband_name_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->dropColumn('husband_name_en');
        });
    }
};
