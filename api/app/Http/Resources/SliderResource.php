<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Slider
 */
class SliderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'image_url' => $this->image_path ? asset('storage/'.$this->image_path) : null,
            'link' => $this->link,
            'slide_date' => $this->slide_date?->toDateString(),
            'is_active' => (bool) $this->is_active,
        ];
    }
}
