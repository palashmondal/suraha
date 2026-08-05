<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'name_en' => $this->name_en,
            'username' => $this->username,
            'phone' => $this->phone,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label_bn' => $this->role->labelBn(),
            'designation' => $this->designation,
            'avatar_url' => $this->avatar_path ? asset('storage/'.$this->avatar_path) : null,
            'scope' => $this->role->scope(),
            'is_read_only' => $this->isReadOnly(),
            'is_active' => (bool) $this->is_active,
            'tenant_id' => $this->tenant_id,
            'district_id' => $this->district_id,
            'union_id' => $this->union_id,
            'ward_no' => $this->ward_no,
            'upazila' => $this->whenLoaded('upazila', fn () => [
                'id' => $this->upazila->id,
                'name' => $this->upazila->name,
                'name_bn' => $this->upazila->name_bn,
            ]),
        ];
    }
}
