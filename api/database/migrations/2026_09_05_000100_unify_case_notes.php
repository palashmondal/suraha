<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * One `notes` table for every module.
 *
 * সাক্ষাৎকার and মানবিক সহায়তা each grew an identical notes table, and নাগরিক পরামর্শ would have
 * made a third. A note is the same thing in all of them — a dated line an officer kept on a case —
 * so it becomes one polymorphic table, and the next module that wants notes adds a trait rather
 * than a migration.
 *
 * Existing rows are carried across; nothing is lost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->morphs('notable');  // Appointment | Assistance | Suggestion | …
            $table->text('body');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        foreach ([
            'appointment_notes' => ['App\Models\Appointment', 'appointment_id'],
            'assistance_notes' => ['App\Models\Assistance', 'assistance_id'],
        ] as $old => [$type, $fk]) {
            if (! Schema::hasTable($old)) {
                continue;
            }

            DB::table($old)->orderBy('id')->chunk(200, function ($rows) use ($type, $fk) {
                DB::table('notes')->insert($rows->map(fn ($r) => [
                    'tenant_id' => $r->tenant_id,
                    'notable_type' => $type,
                    'notable_id' => $r->{$fk},
                    'body' => $r->body,
                    'author_id' => $r->author_id,
                    'created_at' => $r->created_at,
                    'updated_at' => $r->updated_at,
                ])->all());
            });

            Schema::drop($old);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
