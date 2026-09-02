<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Extend the base users table to carry Suraha's roles + scope (SURAHA_BUILD_PROMPT §3). One table
// holds every actor: officers log in with username/password, citizens with mobile + OTP, so email is
// made optional and username/mobile are the alternate identifiers.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('citizen')->after('name'); // App\Enums\Role value
            $table->string('username')->nullable()->unique()->after('role'); // officers
            $table->string('mobile')->nullable()->unique()->after('username'); // citizens (+ some officers)
            $table->string('designation')->nullable()->after('mobile'); // Bangla designation line
            $table->foreignId('upazila_id')->nullable()->after('designation')->constrained()->nullOnDelete();
            $table->foreignId('district_id')->nullable()->after('upazila_id')->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true)->after('district_id');
        });

        // Email is no longer required (citizens have none); keep it unique when present.
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('upazila_id');
            $table->dropConstrainedForeignId('district_id');
            $table->dropColumn(['role', 'username', 'mobile', 'designation', 'is_active']);
        });
    }
};
