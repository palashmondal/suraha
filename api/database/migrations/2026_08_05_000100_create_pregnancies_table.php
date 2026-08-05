<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * প্রসূতি কল্যাণ — Pregnant-Mother Welfare records (SURAHA_BUILD_PROMPT §8.1).
 *
 * Tenant-scoped (one upazila). Captures the FULL detail from the add-form / detail frames
 * (concept_ui/Frame 1171277053.png, Frame 1171277070.png) so birth registration needs no
 * re-entry: the four form sections map to the four column groups below. Post-delivery columns
 * are nullable until the FWA confirms delivery.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pregnancies', function (Blueprint $table) {
            $table->id();

            // Tenancy + provenance
            $table->string('tenant_id')->index();                 // upazila (BelongsToTenant)
            $table->foreignId('union_id')->nullable()->constrained('unions')->nullOnDelete();
            $table->unsignedTinyInteger('ward_no')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete(); // FWA

            // Workflow
            $table->string('delivery_status')->default('not_delivered')->index(); // App\Enums\DeliveryStatus

            // ---- সাধারণ তথ্য (General) ------------------------------------
            $table->string('mother_name_bn');                     // প্রসূতি মায়ের নাম (বাংলাতে)
            $table->string('mother_name_en')->nullable();         // In English (data field)
            $table->string('husband_name')->nullable();           // স্বামীর নাম
            $table->string('register_no')->nullable();            // রেজিস্টার নং
            $table->unsignedTinyInteger('which_child')->nullable(); // কততম সন্তান
            $table->decimal('height_inch', 5, 2)->nullable();     // উচ্চতা (ইঞ্চি)
            $table->decimal('weight_kg', 5, 2)->nullable();       // ওজন (কেজি)
            $table->unsignedTinyInteger('current_age')->nullable(); // বর্তমান বয়স
            $table->unsignedTinyInteger('marriage_age')->nullable(); // বিয়ের বয়স
            $table->string('blood_group')->nullable();            // রক্তের গ্রুপ
            $table->json('chronic_diseases')->nullable();         // দীর্ঘমেয়াদি রোগ (multi)

            // ---- ঠিকানা ও যোগাযোগ (Address & contact) --------------------
            $table->string('address')->nullable();                // ঠিকানা
            $table->decimal('latitude', 10, 7)->nullable();       // বর্তমান অবস্থান (ট্র্যাক করুন)
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('mobile')->nullable();                 // মোবাইল নাম্বার

            // ---- স্বাস্থ্য সংক্রান্ত তথ্য (Health) ------------------------
            $table->unsignedTinyInteger('tt_vaccine_count')->nullable();   // টিটি টিকা গ্রহনের সংখ্যা
            $table->date('last_tt_date')->nullable();                      // সর্বশেষ টিটি টিকার তারিখ
            $table->date('last_menstruation_date')->nullable();            // সর্বশেষ মাসিকের তারিখ
            $table->unsignedTinyInteger('gravida_count')->nullable();      // গর্ভধারনের সংখ্যা
            $table->unsignedTinyInteger('prior_miscarriages')->nullable(); // পূর্ববর্তী গর্ভপাতের সংখ্যা
            $table->unsignedTinyInteger('last_child_age')->nullable();     // সর্বশেষ সন্তানের বয়স
            $table->unsignedTinyInteger('prior_normal_deliveries')->nullable();   // (স্বাভাবিক)
            $table->unsignedTinyInteger('prior_cesarean_deliveries')->nullable(); // (সিজার)
            $table->string('prior_delivery_place')->nullable();            // পূর্ববর্তী ডেলিভারির স্থান

            // ---- ডেলিভারি সংক্রান্ত তথ্য — pre-delivery plan --------------
            $table->date('expected_delivery_date')->nullable();   // প্রসবের সম্ভাব্য তারিখ
            $table->string('delivery_place_plan')->nullable();    // কোথায় প্রসব করাবেন
            $table->boolean('emergency_transport')->nullable();   // জরুরি অবস্থার পরিবহন আছে?
            $table->boolean('enough_money')->nullable();          // ভ্রমনের যথেষ্ট টাকা আছে?
            $table->boolean('blood_donor_arranged')->nullable();  // রক্তদাতা স্থির আছে?

            // ---- ডেলিভারি সংক্রান্ত তথ্য — post-delivery (set on confirm) --
            $table->date('actual_delivery_date')->nullable();     // প্রকৃত ডেলিভারি তারিখ
            $table->boolean('mother_alive')->nullable();          // মায়ের অবস্থা (জীবিত)
            $table->string('delivery_type')->nullable();          // normal | cesarean
            $table->string('delivery_place')->nullable();         // প্রকৃত প্রসবের স্থান
            $table->unsignedTinyInteger('newborn_count')->nullable(); // নবজাতকের সংখ্যা
            $table->boolean('newborn_alive')->nullable();         // নবজাতকের অবস্থা
            $table->string('baby_sex')->nullable();               // male | female (ছেলে/মেয়ে)
            $table->decimal('birth_weight_kg', 4, 2)->nullable(); // জন্ম ওজন
            $table->decimal('birth_height_inch', 4, 2)->nullable(); // জন্ম উচ্চতা
            $table->time('birth_time')->nullable();               // জন্ম সময়

            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pregnancies');
    }
};
