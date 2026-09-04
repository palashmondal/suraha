<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Appointment
 */
class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tracking_token' => $this->tracking_token,
            'status' => $this->status->value,
            'status_label' => $this->status->labelBn(),
            'status_tone' => $this->status->tone(),

            'applicant_name' => $this->applicant_name,
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'ward_no' => $this->ward_no,
            'address' => $this->address,
            'mobile' => $this->mobile,

            'purpose' => $this->purpose,
            'description' => $this->description,
            'appointment_date' => $this->appointment_date?->toDateString(),
            'appointment_time' => $this->appointment_time,
            'decision_note' => $this->decision_note,
            'office' => $this->officeBn(),
            'created_at' => $this->created_at?->toDateString(),

            'notes' => $this->whenLoaded('notes', fn () => $this->notes->map(fn ($n) => [
                'id' => $n->id,
                'body' => $n->body,
                'author' => $n->author?->name,
                'created_at' => $n->created_at?->toDateString(),
            ])),
        ];
    }
}
