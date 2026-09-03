<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * জন্ম নিবন্ধন — Birth Registration (§8.2). Connected ← Pregnancy: normally created automatically
 * from an approved delivery via BDRIS, but manual entry is also allowed. Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birth_registrations', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('pregnancy_id')->nullable()->constrained('pregnancies')->nullOnDelete();

            $table->string('status')->default('pending_entry')->index(); // App\Enums\BirthRegStatus
            $table->string('registration_no')->nullable();               // জন্মনিবন্ধন নাম্বার (BDRIS)

            // Subject (copied from the pregnancy so birth reg needs no re-entry, §8.1)
            $table->string('child_name')->nullable();   // সন্তানের নাম
            $table->string('mother_name');              // মায়ের নাম
            $table->string('father_name')->nullable();  // পিতার নাম
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();          // male | female

            // BDRIS integration (§10)
            $table->string('certificate_path')->nullable(); // generated certificate (tenant-scoped)
            $table->string('bdris_reference')->nullable();   // idempotency / tracking ref
            $table->timestamp('bdris_submitted_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birth_registrations');
    }
};
