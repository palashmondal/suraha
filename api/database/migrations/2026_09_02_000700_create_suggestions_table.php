<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * নাগরিক পরামর্শ — what a citizen thinks the upazila should do: a bridge, a school, a road, or
 * something they would rather say privately. Filed like a complaint but never investigated; the
 * UNO reads it and takes it forward or sets it aside.
 *
 * `is_confidential` hides the applicant's identity from the listing — the point of offering a
 * confidential channel is that the name does not travel with the suggestion.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suggestions', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_token')->nullable()->unique();
            $table->string('tenant_id')->index();
            $table->string('status')->default('pending')->index();   // App\Enums\SuggestionStatus
            $table->string('kind')->index();                          // App\Enums\SuggestionKind
            $table->boolean('is_confidential')->default(false);

            // পরামর্শদাতা
            $table->string('applicant_name');
            $table->foreignId('citizen_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->string('mobile')->nullable();

            // পরামর্শ
            $table->string('title');
            $table->text('description');

            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suggestions');
    }
};
