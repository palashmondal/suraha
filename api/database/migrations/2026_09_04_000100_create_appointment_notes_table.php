<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * সাক্ষাৎকার নোট (§8.3) — the UNO's own running notes on an appointment: what came out of the
 * meeting, what to follow up on, anything worth remembering. Separate rows rather than a column
 * on `appointments` because notes accumulate over days and each one carries its own date.
 * Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_notes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('appointment_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_notes');
    }
};
