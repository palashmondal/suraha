<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTenantsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->string('id')->primary();

            // Suraha: a tenant IS an upazila (sub-district). Custom registry columns:
            $table->string('name');                 // English name, e.g. "Golachipa"
            $table->string('name_bn');               // Bangla name, e.g. "গলাচিপা"
            $table->foreignId('district_id')->constrained('districts');
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->json('data')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
}
