<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * পিতার নাম on an অভিযোগ (§8.4). Bangladeshi records identify a person by name + father's name,
 * and an upazila has many people sharing a first name — the complainant's name alone is not an
 * identity. Nullable: complaints already filed have none, and a citizen filing online may omit it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('father_name')->nullable()->after('complainant_name');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn('father_name');
        });
    }
};
