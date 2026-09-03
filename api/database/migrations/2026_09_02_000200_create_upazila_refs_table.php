<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reference list of all 491 upazilas of Bangladesh — the options SEAL picks from when creating an
 * instance. This is a lookup registry, NOT the tenant table: `tenants` holds only the upazilas
 * actually provisioned on the platform, and its id is the subdomain label.
 *
 * `slug` is the subdomain that would be generated for this upazila. It is unique nationwide:
 * nine upazila names recur across districts (Kaliganj is in four), so those are qualified with
 * the district — see database/data/bd-upazilas.json.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('upazila_refs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained()->cascadeOnDelete();
            $table->string('name');       // e.g. "Galachipa"
            $table->string('name_bn');    // e.g. "গলাচিপা"
            $table->string('slug')->unique();
            $table->timestamps();

            $table->unique(['district_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upazila_refs');
    }
};
