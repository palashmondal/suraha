<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * In-app notifications (§9 — in-app only). Tenant + role scoped: an event targets the role that
 * acts on it (new mother → Sochib; new complaint / appointment → UNO). Surfaced in the top-bar
 * bell. No SMS/email/push.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('type');                 // pregnancy | complaint | appointment
            $table->string('target_role')->index(); // which role should see it
            $table->string('title');
            $table->string('detail')->nullable();
            $table->string('link')->nullable();      // route to open
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
