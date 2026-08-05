<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_en')->nullable();            // optional English name (data field)

            // Officers authenticate with an admin-created username; citizens with mobile + OTP.
            $table->string('username')->nullable()->unique();
            $table->string('phone')->nullable()->unique();
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('password')->nullable();           // null for citizens (OTP-only)

            // RBAC + tenancy scope (see App\Enums\Role). Kept as plain indexed columns, not
            // DB foreign keys: this table is created before the registry tables, and §4 calls
            // for avoiding cross-tenant FKs (clean boundary for single-upazila export later).
            $table->string('role')->index();                  // fwa|up_sochib|uno|investigating_officer|dc|seal_admin|citizen
            $table->string('tenant_id')->nullable()->index(); // officer/citizen upazila; null for seal_admin
            $table->unsignedBigInteger('district_id')->nullable()->index(); // dc scope
            $table->unsignedBigInteger('union_id')->nullable();             // fwa/officer union scope
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->string('designation')->nullable();        // পদবী (Bangla)
            $table->string('avatar_path')->nullable();
            $table->boolean('is_active')->default(true);

            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
