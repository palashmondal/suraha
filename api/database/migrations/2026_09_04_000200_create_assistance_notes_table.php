<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * সহায়তা কার্যক্রম (§8) — the UNO's running notes and decisions on one aid application, the same
 * shape as `appointment_notes`: separate rows because they accumulate over days and each one
 * carries its own date and author. Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistance_notes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('assistance_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistance_notes');
    }
};
