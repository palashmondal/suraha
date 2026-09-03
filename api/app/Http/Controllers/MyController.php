<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Assistance;
use App\Models\Complaint;
use App\Models\Suggestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A citizen's own submissions (§7) — their complaints and appointments with tracking tokens and
 * current status, so they can review everything they've filed in this upazila.
 */
class MyController extends Controller
{
    public function submissions(Request $request): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');
        $id = $request->user()->id;

        $complaints = Complaint::where('citizen_id', $id)->latest()->get()->map(fn (Complaint $c) => [
            'type' => 'complaint',
            'type_label' => 'অভিযোগ',
            'token' => $c->tracking_token,
            'title' => $c->title,
            'status_label' => $c->status->labelBn(),
            'status_tone' => $c->status->tone(),
            'date' => $c->created_at?->toDateString(),
        ]);

        $appointments = Appointment::where('citizen_id', $id)->latest()->get()->map(fn (Appointment $a) => [
            'type' => 'appointment',
            'type_label' => 'সাক্ষাৎকার',
            'token' => $a->tracking_token,
            'title' => $a->purpose,
            'status_label' => $a->status->labelBn(),
            'status_tone' => $a->status->tone(),
            'date' => $a->created_at?->toDateString(),
        ]);

        $assistances = Assistance::where('citizen_id', $id)->latest()->get()->map(fn (Assistance $a) => [
            'type' => 'assistance',
            'type_label' => 'মানবিক সহায়তা',
            'token' => $a->tracking_token,
            'title' => $a->title,
            'status_label' => $a->status->labelBn(),
            'status_tone' => $a->status->tone(),
            'date' => $a->created_at?->toDateString(),
        ]);

        $suggestions = Suggestion::where('citizen_id', $id)->latest()->get()->map(fn (Suggestion $s) => [
            'type' => 'suggestion',
            'type_label' => 'নাগরিক পরামর্শ',
            'token' => $s->tracking_token,
            'title' => $s->title,
            'status_label' => $s->status->labelBn(),
            'status_tone' => $s->status->tone(),
            'date' => $s->created_at?->toDateString(),
        ]);

        return response()->json([
            'submissions' => $complaints
                ->concat($appointments)
                ->concat($assistances)
                ->concat($suggestions)
                ->sortByDesc('date')
                ->values(),
        ]);
    }
}
