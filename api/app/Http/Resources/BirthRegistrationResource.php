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
            'child_name_en' => $this->child_name_en,
            'mother_name' => $this->mother_name,
            'mother_name_en' => $this->mother_name_en,
            'mother_nid' => $this->mother_nid,
            'mother_birth_reg_no' => $this->mother_birth_reg_no,
            'mother_nationality' => $this->mother_nationality,
            'father_name' => $this->father_name,
            'father_name_en' => $this->father_name_en,
            'father_nid' => $this->father_nid,
            'father_birth_reg_no' => $this->father_birth_reg_no,
            'father_nationality' => $this->father_nationality,
            'place_of_birth' => $this->place_of_birth,
            'permanent_address' => $this->permanent_address,
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'upazila' => $this->whenLoaded('upazila', fn () => $this->upazila?->name_bn),
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
