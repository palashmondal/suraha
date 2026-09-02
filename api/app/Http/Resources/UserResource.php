<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a user for the PWA. Fields mirror the frontend SessionUser type exactly
 * (web/src/auth/roles.ts): id, role, name, designation, upazila (display string), mobile.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'role' => $this->role->value,
            'name' => $this->name,
            'designation' => $this->designation ?? $this->role->label(),
            'upazila' => $this->contextLabel(),
            'mobile' => $this->mobile,
        ];
    }
}
