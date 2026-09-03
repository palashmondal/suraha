<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The full face of a BDRIS জন্ম নিবন্ধন সনদ. The সচিব now fills the certificate form itself —
 * prefilled from the mother's record, every field editable — so everything the certificate prints
 * has to be storable, not derived at render time from whatever the প্রসূতি row happened to hold.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('birth_registrations', function (Blueprint $table) {
            $table->string('child_name_en')->nullable();

            $table->string('mother_name_en')->nullable();
            $table->string('mother_nid', 20)->nullable();
            $table->string('mother_birth_reg_no', 20)->nullable();
            $table->string('mother_nationality')->nullable();

            $table->string('father_name_en')->nullable();
            $table->string('father_nid', 20)->nullable();
            $table->string('father_birth_reg_no', 20)->nullable();
            $table->string('father_nationality')->nullable();

            $table->string('place_of_birth')->nullable();
            $table->string('permanent_address', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('birth_registrations', function (Blueprint $table) {
            $table->dropColumn([
                'child_name_en',
                'mother_name_en', 'mother_nid', 'mother_birth_reg_no', 'mother_nationality',
                'father_name_en', 'father_nid', 'father_birth_reg_no', 'father_nationality',
                'place_of_birth', 'permanent_address',
            ]);
        });
    }
};
