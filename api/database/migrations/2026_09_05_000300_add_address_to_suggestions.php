<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ঠিকানা on a পরামর্শ — the other three citizen submissions carry one, and the UNO reads the
 * suggester's details the same way there. Nullable, and never sent for a confidential suggestion.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suggestions', fn (Blueprint $t) => $t->string('address')->nullable()->after('ward_no'));
    }

    public function down(): void
    {
        Schema::table('suggestions', fn (Blueprint $t) => $t->dropColumn('address'));
    }
};
