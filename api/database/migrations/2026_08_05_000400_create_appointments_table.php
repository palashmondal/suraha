<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * সাক্ষাৎকার — UNO Appointments (§8.3). Citizens request; the UNO approves / rejects / reschedules.
 * Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('status')->default('pending')->index(); // App\Enums\AppointmentStatus

            // সাক্ষাত প্রার্থীর পরিচয় (applicant identity)
            $table->string('applicant_name');
            $table->foreignId('citizen_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->string('address')->nullable();
            $table->string('mobile')->nullable();

            // সাক্ষাৎকার আবেদন (request)
            $table->string('purpose');                    // সাক্ষাতের কারন / ধরণ
            $table->text('description')->nullable();       // বিস্তারিত বিবরণ
            $table->date('appointment_date')->nullable();  // তারিখ
            $table->time('appointment_time')->nullable();  // সময়

            // Decision
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
