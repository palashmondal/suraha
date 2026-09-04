<?php

declare(strict_types=1);

use App\Support\TrackingToken;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Rows created before the token was assigned on the model (seeded appointments and complaints,
 * mainly) carry a null tracking_token, so their detail pages show no tracking block and they
 * cannot be looked up publicly. Give every one of them a token.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['complaints' => 'SUR-CMP', 'appointments' => 'SUR-APT', 'assistances' => 'SUR-AID', 'suggestions' => 'SUR-SUG'] as $table => $prefix) {
            DB::table($table)->whereNull('tracking_token')->orderBy('id')->pluck('id')
                ->each(fn ($id) => DB::table($table)->where('id', $id)
                    ->update(['tracking_token' => TrackingToken::generate($prefix, $table)]));
        }
    }

    public function down(): void
    {
        // Tokens are handed to citizens; there is nothing to roll back to.
    }
};
