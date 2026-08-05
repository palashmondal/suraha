<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ইমেজ স্লাইডার — public-awareness carousel (§8.5), shown on the landing page + dashboard.
 * Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sliders', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('title');
            $table->string('image_path')->nullable();
            $table->string('link')->nullable();          // external "Go to" link
            $table->date('slide_date')->nullable();
            $table->boolean('is_active')->default(true);  // চলমান / বন্ধ আছে
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sliders');
    }
};
