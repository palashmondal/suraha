<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * সাধারণ তথ্য — General Info (§8.6): editable public content surfaced on the public site.
 * `type` = phone (প্রয়োজনীয় ফোন নাম্বার: title=label, value=number) or about (উপজেলা সম্পর্কিত:
 * title + value=body). Tenant-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('general_infos', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->string('type')->index();   // phone | about
            $table->string('title');
            $table->text('value');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('general_infos');
    }
};
