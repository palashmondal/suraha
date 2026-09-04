<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Assistance */
class AssistanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tracking_token' => $this->tracking_token,
            'status' => $this->status->value,
            'status_label' => $this->status->labelBn(),
            'status_tone' => $this->status->tone(),
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->labelBn(),
            'is_important' => (bool) $this->is_important,
            'applicant_name' => $this->applicant_name,
            'mobile' => $this->mobile,
            'nid' => $this->nid,
            'address' => $this->address,
            'ward_no' => $this->ward_no,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'title' => $this->title,
            'description' => $this->description,
            'amount_requested' => $this->amount_requested,
            'amount_approved' => $this->amount_approved,
            'decision_note' => $this->decision_note,
            'decided_at' => $this->decided_at?->toIso8601String(),
            'created_at' => $this->created_at?->toDateString(),
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($a) => [
                'url' => $a->url(),
                'original_name' => $a->original_name,
                'kind' => $a->kind,
            ])->all()),

            'notes' => NoteResource::collection($this->whenLoaded('notes')),
        ];
    }
}
