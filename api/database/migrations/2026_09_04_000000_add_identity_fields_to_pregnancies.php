<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parent identity for the জন্ম নিবন্ধন chain. A BDRIS birth-registration application needs the
 * parents' NID and/or their own birth-registration numbers — none of which the §8.1 form captured,
 * so the Sochib had to chase them separately at approval time. Collected on the প্রসূতি record
 * instead, where the FWA is already sitting with the family.
 *
 * "Father" here is the child's father, i.e. the `husband_name` already on this table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->string('mother_nid', 20)->nullable();           // মায়ের জাতীয় পরিচয়পত্র নম্বর
            $table->string('mother_birth_reg_no', 20)->nullable();  // মায়ের জন্ম নিবন্ধন নম্বর
            $table->string('father_nid', 20)->nullable();           // পিতার (স্বামীর) এনআইডি নম্বর
            $table->string('father_birth_reg_no', 20)->nullable();  // পিতার জন্ম নিবন্ধন নম্বর
        });
    }

    public function down(): void
    {
        Schema::table('pregnancies', function (Blueprint $table) {
            $table->dropColumn(['mother_nid', 'mother_birth_reg_no', 'father_nid', 'father_birth_reg_no']);
        });
    }
};
