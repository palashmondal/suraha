<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rework the complaint lifecycle (§8.4): remove the pre-investigation schedule step; the flow is
 * now pending → (UNO accepts & appoints, with a report due date) assigned → officer submits report
 * → UNO schedules a hearing → UNO's order (completed / re-investigate). The step history + report
 * attachments move into complaint_events + complaint_attachments so the detail page can render a
 * full chronological timeline (including re-investigation loops).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->date('due_date')->nullable()->after('assigned_at');       // report deadline
            $table->date('hearing_date')->nullable()->after('due_date');      // next hearing
            $table->timestamp('completed_at')->nullable()->after('resolved_at');
        });

        Schema::create('complaint_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->string('tenant_id')->index();
            // filed | accepted | rejected | report | hearing_scheduled | reinvestigation | completed
            $table->string('type');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_role')->nullable();
            $table->text('comment')->nullable();
            $table->json('meta')->nullable();  // e.g. {officer_id, officer_name, due_date, hearing_date}
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        Schema::create('complaint_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_event_id')->constrained('complaint_events')->cascadeOnDelete();
            $table->string('tenant_id')->index();
            $table->string('path');
            $table->string('original_name')->nullable();
            $table->string('mime')->nullable();
            $table->string('kind')->default('image'); // image | pdf
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
        });

        // ---- Remap any existing rows to the new status set + seed a baseline timeline ----------
        DB::table('complaints')->where('status', 'filed')->update(['status' => 'pending']);
        DB::table('complaints')->where('status', 'scheduled')->update(['status' => 'pending']);
        DB::table('complaints')->where('status', 'resolved')->update(['status' => 'completed', 'completed_at' => DB::raw('resolved_at')]);

        foreach (DB::table('complaints')->get() as $c) {
            DB::table('complaint_events')->insert([
                'complaint_id' => $c->id,
                'tenant_id' => $c->tenant_id,
                'type' => 'filed',
                'actor_id' => $c->created_by,
                'comment' => null,
                'meta' => null,
                'created_at' => $c->created_at,
                'updated_at' => $c->created_at,
            ]);

            if ($c->assigned_at) {
                DB::table('complaint_events')->insert([
                    'complaint_id' => $c->id,
                    'tenant_id' => $c->tenant_id,
                    'type' => 'accepted',
                    'actor_id' => null,
                    'comment' => null,
                    'meta' => json_encode(['officer_id' => $c->investigating_officer_id]),
                    'created_at' => $c->assigned_at,
                    'updated_at' => $c->assigned_at,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_attachments');
        Schema::dropIfExists('complaint_events');
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['due_date', 'hearing_date', 'completed_at']);
        });
    }
};
