<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Upazila
 */
class UpazilaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,                       // slug == subdomain label
            'name' => $this->name,
            'name_bn' => $this->name_bn,
            'is_active' => (bool) $this->is_active,
            'district' => $this->whenLoaded('district', fn () => [
                'id' => $this->district->id,
                'name' => $this->district->name,
                'name_bn' => $this->district->name_bn,
            ]),
            'unions_count' => $this->whenCounted('unions'),
            'domain' => $this->id.'.'.config('tenancy.base_domain', 'suraha.net'),
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
