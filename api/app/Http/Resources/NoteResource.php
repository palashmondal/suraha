<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A dated officer note. The same shape wherever notes appear — সাক্ষাৎকার, মানবিক সহায়তা,
 * নাগরিক পরামর্শ — so the web client has one type for all of them.
 *
 * @mixin \App\Models\Note
 */
class NoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'author' => $this->author?->name,
            'created_at' => $this->created_at?->toDateString(),
        ];
    }
}
