<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * অভিযোগ — Complaints (§8.4). Citizens file; UNO schedules + assigns an investigating officer;
 * the officer submits findings; UNO resolves/rejects. Lifecycle timestamps drive the detail
 * timeline (অভিযোগ দাখিল → শিডিউল যুক্ত → তদন্তকারী যুক্ত → নিষ্পত্তি). Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('status')->default('filed')->index(); // App\Enums\ComplaintStatus

            // অভিযোগকারীর পরিচয় (complainant identity)
            $table->string('complainant_name');
            $table->foreignId('citizen_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();   // ঘটনাস্থল live location
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('mobile')->nullable();

            // অভিযোগের বিস্তারিত (complaint details)
            $table->string('title');                            // শিরোনাম
            $table->date('complaint_date')->nullable();
            $table->time('complaint_time')->nullable();
            $table->text('description')->nullable();
            $table->string('attachment_path')->nullable();      // photo/PDF

            // Lifecycle
            $table->date('schedule_date')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->foreignId('investigating_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();

            // নিষ্পত্তির বিস্তারিত (resolution)
            $table->text('findings')->nullable();
            $table->string('findings_attachment_path')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('resolution_note')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
