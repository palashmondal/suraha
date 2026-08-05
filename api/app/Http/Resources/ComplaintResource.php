<?php

declare(strict_types=1);

namespace App\Http\Resources;

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
            'status_label' => $this->status->labelBn(),
            'status_tone' => $this->status->tone(),

            'title' => $this->title,
            'complainant_name' => $this->complainant_name,
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'ward_no' => $this->ward_no,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'mobile' => $this->mobile,

            'complaint_date' => $this->complaint_date?->toDateString(),
            'complaint_time' => $this->complaint_time,
            'description' => $this->description,
            'has_attachment' => (bool) $this->attachment_path,

            'schedule_date' => $this->schedule_date?->toDateString(),
            'investigating_officer_id' => $this->investigating_officer_id,
            'investigating_officer' => $this->whenLoaded('investigatingOfficer', fn () => $this->investigatingOfficer?->name),
            'findings' => $this->findings,
            'resolution_note' => $this->resolution_note,

            // Lifecycle timestamps → detail timeline
            'filed_at' => $this->created_at?->toDateTimeString(),
            'scheduled_at' => $this->scheduled_at?->toDateTimeString(),
            'assigned_at' => $this->assigned_at?->toDateTimeString(),
            'resolved_at' => $this->resolved_at?->toDateTimeString(),
            'rejected_at' => $this->rejected_at?->toDateTimeString(),
        ];
    }
}
