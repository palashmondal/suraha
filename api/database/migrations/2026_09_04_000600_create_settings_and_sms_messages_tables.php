<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two central (non-tenant) tables behind the SMS সেটিংস page.
 *
 * `settings` holds credentials an admin can change without a redeploy — the SMS API key lives
 * here so rotating it is a paste in the UI rather than an SSH session and a restart. Values are
 * encrypted at rest (see the Setting model).
 *
 * `sms_messages` is our own send log: the provider reports a balance but not what Suraha spent it
 * on, so usage by day, by status and by purpose has to be recorded as it happens.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('sms_messages', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->nullable()->index();  // null for OTP, which precedes login
            $table->string('purpose')->index();                 // otp | appointment | …
            $table->string('phone');
            $table->unsignedSmallInteger('parts')->default(1);  // Bangla is Unicode: 70 chars each
            $table->boolean('sent')->default(false)->index();
            $table->string('error')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_messages');
        Schema::dropIfExists('settings');
    }
};
