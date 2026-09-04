<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * সংযুক্তি — the photos and PDFs a citizen attaches to an অভিযোগ / সহায়তার আবেদন / পরামর্শ.
 * One polymorphic table for all three: the file is the same thing in each, and the officer
 * detail pages render them through one component. (The investigation report's own files stay on
 * `complaint_attachments`, which hang off a timeline event rather than the record.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->morphs('attachable');
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->string('mime')->nullable();
            $table->string('kind')->default('image'); // image | pdf
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
