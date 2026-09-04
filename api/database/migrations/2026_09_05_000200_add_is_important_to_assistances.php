<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * গুরুত্বপূর্ণ আবেদন — the same mark the UNO puts on a পরামর্শ, on an aid application. Not a
 * status: an application is marked while still অপেক্ষমান and keeps the mark after the decision,
 * so the তালিকা's গুরুত্বপূর্ণ tab cuts across all of them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assistances', fn (Blueprint $t) => $t->boolean('is_important')->default(false)->index());
    }

    public function down(): void
    {
        Schema::table('assistances', fn (Blueprint $t) => $t->dropColumn('is_important'));
    }
};
