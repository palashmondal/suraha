<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Suggestion */
class SuggestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // A confidential suggestion is read on its content alone: the identifying fields are not
        // sent at all rather than hidden in the UI, so they cannot leak through the API.
        $anonymous = (bool) $this->is_confidential;

        return [
            'id' => $this->id,
            'tracking_token' => $this->tracking_token,
            'status' => $this->status->value,
            'status_label' => $this->status->labelBn(),
            'status_tone' => $this->status->tone(),
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->labelBn(),
            'is_confidential' => $anonymous,
            'is_important' => (bool) $this->is_important,
            'applicant_name' => $anonymous ? null : $this->applicant_name,
            'mobile' => $anonymous ? null : $this->mobile,
            'ward_no' => $anonymous ? null : $this->ward_no,
            'address' => $anonymous ? null : $this->address,
            'union' => $anonymous ? null : $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'title' => $this->title,
            'description' => $this->description,
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
