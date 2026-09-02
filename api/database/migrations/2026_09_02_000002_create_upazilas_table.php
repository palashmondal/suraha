<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Upazila registry = the tenant. Each upazila is one subdomain (golachipa.suraha.com.bd). Tenant
// scoping is applied in-app by upazila_id on the central database now; a single upazila can later be
// split out to self-host (SURAHA_BUILD_PROMPT §1.1(8), §12).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('upazilas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->string('name');        // Bangla display name, e.g. গলাচিপা উপজেলা
            $table->string('name_en')->nullable();
            $table->string('subdomain')->unique(); // tenant key resolved from the request host
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upazilas');
    }
};
