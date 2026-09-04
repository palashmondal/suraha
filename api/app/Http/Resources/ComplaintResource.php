<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ComplaintEvent;
use App\Support\UpazilaOffice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Complaint
 */
class ComplaintResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tracking_token' => $this->tracking_token,
            'status' => $this->status->value,
            // Derived, not stored: a scheduled hearing reads as its own stage. See the model.
            'status_label' => $this->statusLabelBn(),
            'status_tone' => $this->statusTone(),

            'title' => $this->title,
            'complainant_name' => $this->complainant_name,
            'father_name' => $this->father_name,
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'upazila' => $this->whenLoaded('upazila', fn () => $this->upazila?->name_bn),
            // Where a শুনানি is held — the same venue string the .ics feed and the SMS use.
            'office' => UpazilaOffice::nameBn(),
            'ward_no' => $this->ward_no,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'mobile' => $this->mobile,

            'complaint_date' => $this->complaint_date?->toDateString(),
            'complaint_time' => $this->complaint_time,
            'description' => $this->description,
            'has_attachment' => (bool) $this->attachment_path,

            // Current investigation state (drives the UNO's action buttons).
            'investigating_officer_id' => $this->investigating_officer_id,
            'investigating_officer' => $this->whenLoaded('investigatingOfficer', fn () => $this->investigatingOfficer?->name),
            'due_date' => $this->due_date?->toDateString(),
            'hearing_date' => $this->hearing_date?->toDateString(),

            'filed_at' => $this->created_at?->toDateTimeString(),
            'assigned_at' => $this->assigned_at?->toDateTimeString(),
            'completed_at' => $this->completed_at?->toDateTimeString(),
            'rejected_at' => $this->rejected_at?->toDateTimeString(),

            // What the citizen attached when filing.
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($a) => [
                'url' => $a->url(),
                'original_name' => $a->original_name,
                'kind' => $a->kind,
            ])->all()),

            // Full step history → detail timeline (oldest → newest).
            'timeline' => $this->whenLoaded('events', fn () => $this->events->map(fn (ComplaintEvent $e) => [
                'id' => $e->id,
                'type' => $e->type,
                'label' => $e->labelBn(),
                'actor_name' => $e->actor?->name,
                'actor_role' => $e->actor_role,
                'comment' => $e->comment,
                'meta' => $e->meta,
                'at' => $e->created_at?->toDateTimeString(),
                'attachments' => $e->attachments->map(fn ($a) => [
                    'url' => $a->url(),
                    'original_name' => $a->original_name,
                    'kind' => $a->kind,
                ])->all(),
            ])->all()),
        ];
    }
}
