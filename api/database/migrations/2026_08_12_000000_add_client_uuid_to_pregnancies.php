<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotency key for the FWA mobile app: a client-generated UUID lets a retried "create" after a
 * flaky connection resolve to the same row instead of duplicating the mother. Unique per tenant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->after('id');
            $table->unique(['tenant_id', 'client_uuid']);
        });
    }

    public function down(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'client_uuid']);
            $table->dropColumn('client_uuid');
        });
    }
};
