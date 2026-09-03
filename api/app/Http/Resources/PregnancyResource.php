<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Pregnancy
 */
class PregnancyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'delivery_status' => $this->delivery_status->value,
            'delivery_status_label' => $this->delivery_status->labelBn(),
            'delivery_status_tone' => $this->delivery_status->tone(),

            // General
            'mother_name_bn' => $this->mother_name_bn,
            'mother_name_en' => $this->mother_name_en,
            'husband_name' => $this->husband_name,
            'register_no' => $this->register_no,
            'which_child' => $this->which_child,
            'height_inch' => $this->height_inch,
            'weight_kg' => $this->weight_kg,
            'current_age' => $this->current_age,
            'marriage_age' => $this->marriage_age,
            'blood_group' => $this->blood_group,
            'chronic_diseases' => $this->chronic_diseases ?? [],

            // Address & contact
            'union_id' => $this->union_id,
            'union' => $this->whenLoaded('union', fn () => $this->union?->name_bn),
            'ward_no' => $this->ward_no,
            'address' => $this->address,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'mobile' => $this->mobile,

            // Health
            'tt_vaccine_count' => $this->tt_vaccine_count,
            'last_tt_date' => $this->last_tt_date?->toDateString(),
            'last_menstruation_date' => $this->last_menstruation_date?->toDateString(),
            'gravida_count' => $this->gravida_count,
            'prior_miscarriages' => $this->prior_miscarriages,
            'last_child_age' => $this->last_child_age,
            'prior_normal_deliveries' => $this->prior_normal_deliveries,
            'prior_cesarean_deliveries' => $this->prior_cesarean_deliveries,
            'prior_delivery_place' => $this->prior_delivery_place,

            // Delivery — plan
            'expected_delivery_date' => $this->expected_delivery_date?->toDateString(),
            'delivery_place_plan' => $this->delivery_place_plan,
            'emergency_transport' => $this->emergency_transport,
            'enough_money' => $this->enough_money,
            'blood_donor_arranged' => $this->blood_donor_arranged,

            // Delivery — post
            'actual_delivery_date' => $this->actual_delivery_date?->toDateString(),
            'mother_alive' => $this->mother_alive,
            'delivery_type' => $this->delivery_type,
            'delivery_place' => $this->delivery_place,
            'newborn_count' => $this->newborn_count,
            'newborn_alive' => $this->newborn_alive,
            'baby_sex' => $this->baby_sex,
            'birth_weight_kg' => $this->birth_weight_kg,
            'birth_height_inch' => $this->birth_height_inch,
            'birth_time' => $this->birth_time,

            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
