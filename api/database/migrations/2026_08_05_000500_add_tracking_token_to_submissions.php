<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Public tracking tokens (§7): a citizen receives a token when filing a complaint or booking an
 * appointment and can look up its status later without logging in.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['complaints', 'appointments'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->string('tracking_token')->nullable()->unique()->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (['complaints', 'appointments'] as $table) {
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn('tracking_token'));
        }
    }
};
