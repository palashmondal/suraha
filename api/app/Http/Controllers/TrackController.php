<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Assistance;
use App\Models\Complaint;
use App\Models\Suggestion;
use Illuminate\Http\JsonResponse;

/**
 * Public status lookup by tracking token (§7). No authentication — a citizen enters the token
 * they received when filing. Tenant-scoped (the token is resolved within the current upazila),
 * and the route is throttled to prevent enumeration. Returns a read-only status + timeline only.
 */
class TrackController extends Controller
{
    public function show(string $token): JsonResponse
    {
        abort_unless(tenancy()->initialized, 400, 'উপজেলা নির্ধারণ করা যায়নি।');

        if ($complaint = Complaint::where('tracking_token', $token)->first()) {
            return response()->json($this->complaintView($complaint));
        }

        if ($appointment = Appointment::where('tracking_token', $token)->first()) {
            return response()->json($this->appointmentView($appointment));
        }

        if ($assistance = Assistance::where('tracking_token', $token)->first()) {
            return response()->json($this->assistanceView($assistance));
        }

        if ($suggestion = Suggestion::where('tracking_token', $token)->first()) {
            return response()->json($this->suggestionView($suggestion));
        }

        abort(404, 'এই ট্র্যাকিং টোকেন খুঁজে পাওয়া যায়নি।');
    }

    private function complaintView(Complaint $c): array
    {
        return [
            'type' => 'complaint',
            'type_label' => 'অভিযোগ',
            'token' => $c->tracking_token,
            'title' => $c->title,
            'applicant' => $c->complainant_name,
            'date' => $c->complaint_date?->toDateString(),
            'status' => $c->status->value,
            'status_label' => $c->status->labelBn(),
            'status_tone' => $c->status->tone(),
            'timeline' => [
                $this->node('অভিযোগ দাখিল', $c->created_at, true),
                $this->node('তদন্ত কর্মকর্তা নিযুক্ত', $c->assigned_at, (bool) $c->assigned_at),
                $c->rejected_at
                    ? $this->node('বাতিল', $c->rejected_at, true)
                    : $this->node('নিষ্পত্তি সম্পন্ন', $c->completed_at, (bool) $c->completed_at),
            ],
        ];
    }

    private function appointmentView(Appointment $a): array
    {
        return [
            'type' => 'appointment',
            'type_label' => 'সাক্ষাৎকার',
            'token' => $a->tracking_token,
            'title' => $a->purpose,
            'applicant' => $a->applicant_name,
            'date' => $a->appointment_date?->toDateString(),
            'status' => $a->status->value,
            'status_label' => $a->status->labelBn(),
            'status_tone' => $a->status->tone(),
            'timeline' => [
                $this->node('আবেদন জমা', $a->created_at, true),
                $this->node($a->status->labelBn(), $a->decided_at, (bool) $a->decided_at),
            ],
        ];
    }

    private function assistanceView(Assistance $a): array
    {
        return [
            'type' => 'assistance',
            'type_label' => 'মানবিক সহায়তা',
            'token' => $a->tracking_token,
            'title' => $a->title,
            'applicant' => $a->applicant_name,
            'date' => $a->created_at?->toDateString(),
            'status' => $a->status->value,
            'status_label' => $a->status->labelBn(),
            'status_tone' => $a->status->tone(),
            'timeline' => [
                $this->node('আবেদন দাখিল', $a->created_at, true),
                $this->node($a->status->value === 'rejected' ? 'নাকচ' : 'অনুমোদিত', $a->decided_at, (bool) $a->decided_at),
            ],
        ];
    }

    /**
     * A confidential suggestion is still trackable by its author — they hold the token — but the
     * view never echoes the name back, so a leaked token discloses the suggestion and not who
     * made it.
     */
    private function suggestionView(Suggestion $s): array
    {
        return [
            'type' => 'suggestion',
            'type_label' => 'নাগরিক পরামর্শ',
            'token' => $s->tracking_token,
            'title' => $s->title,
            'applicant' => $s->is_confidential ? 'গোপনীয়' : $s->applicant_name,
            'date' => $s->created_at?->toDateString(),
            'status' => $s->status->value,
            'status_label' => $s->status->labelBn(),
            'status_tone' => $s->status->tone(),
            'timeline' => [
                $this->node('পরামর্শ দাখিল', $s->created_at, true),
                $this->node($s->status->value === 'rejected' ? 'নাকচ' : 'গৃহীত', $s->decided_at, (bool) $s->decided_at),
            ],
        ];
    }

    private function node(string $label, $timestamp, bool $done): array
    {
        return [
            'label' => $label,
            'timestamp' => $timestamp?->toDateString(),
            'done' => $done,
        ];
    }
}
