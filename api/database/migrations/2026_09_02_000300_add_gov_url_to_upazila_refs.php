<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The upazila's own government site (e.g. https://galachipa.patuakhali.gov.bd). Kept because the
 * slug is derived from it — it is the provenance for why a subdomain is named what it is.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('upazila_refs', function (Blueprint $table) {
            $table->string('gov_url')->nullable()->after('slug');
        });
    }

    public function down(): void
    {
        Schema::table('upazila_refs', function (Blueprint $table) {
            $table->dropColumn('gov_url');
        });
    }
};
