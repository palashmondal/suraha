<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * মানবিক সহায়তা — a citizen's application for help (financial, medical, disaster relief and so
 * on). Same shape as an appointment request: filed by a citizen, decided once by the UNO, and
 * followable from the public site by tracking token. Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistances', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_token')->nullable()->unique();
            $table->string('tenant_id')->index();
            $table->string('status')->default('pending')->index();   // App\Enums\AssistanceStatus
            $table->string('kind')->index();                          // App\Enums\AssistanceKind

            // আবেদনকারীর পরিচয়
            $table->string('applicant_name');
            $table->foreignId('citizen_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->string('address')->nullable();
            $table->string('mobile')->nullable();
            $table->string('nid')->nullable();

            // আবেদন
            $table->string('title');
            $table->text('description')->nullable();
            // Stored in taka. Nullable because non-financial help has no figure attached.
            $table->unsignedInteger('amount_requested')->nullable();
            $table->unsignedInteger('amount_approved')->nullable();

            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistances');
    }
};
