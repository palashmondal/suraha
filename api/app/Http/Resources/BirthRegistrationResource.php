<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\BirthRegistration
 */
class BirthRegistrationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'registration_no' => $this->registration_no,
            'status' => $this->status->value,
            'status_label' => $this->status->labelBn(),
            'status_tone' => $this->status->tone(),

            'child_name' => $this->child_name,
            'mother_name' => $this->mother_name,
            'father_name' => $this->father_name,
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'ward_no' => $this->ward_no,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'sex' => $this->sex,

            'pregnancy_id' => $this->pregnancy_id,
            'has_certificate' => (bool) $this->certificate_path,
            'bdris_reference' => $this->bdris_reference,
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
