<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The newborn's name, taken by the FWA on the ডেলিভারি নিশ্চিত করুন form. Optional — a name is
 * often not chosen on the day — but when it is given it saves the সচিব re-asking for it: the
 * জন্ম নিবন্ধন certificate form prefills from here.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->string('child_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->dropColumn('child_name');
        });
    }
};
