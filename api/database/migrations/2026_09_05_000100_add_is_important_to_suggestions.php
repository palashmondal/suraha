<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * গুরুত্বপূর্ণ পরামর্শ — the UNO's own mark on a suggestion worth coming back to. Deliberately not
 * a status: a suggestion is marked while it is still নতুন and stays marked after it is গৃহীত or
 * নথিজাত, so the তালিকা's গুরুত্বপূর্ণ tab cuts across all three.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suggestions', fn (Blueprint $t) => $t->boolean('is_important')->default(false)->index());
    }

    public function down(): void
    {
        Schema::table('suggestions', fn (Blueprint $t) => $t->dropColumn('is_important'));
    }
};
