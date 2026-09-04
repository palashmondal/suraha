<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\UploadedFile;

/** Citizen-supplied সংযুক্তি on a submission — shared by Complaint, Assistance and Suggestion. */
trait HasAttachments
{
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')->oldest('id');
    }

    /** Stores the file on the public disk and records it against this submission. */
    public function attachFile(UploadedFile $file): Attachment
    {
        $attachment = $this->attachments()->make([
            'path' => $file->store($this->getTable().'/'.$this->getKey(), 'public'),
            'original_name' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'kind' => str_contains((string) $file->getMimeType(), 'pdf') ? 'pdf' : 'image',
        ]);
        // The file belongs to the record's upazila, never to whatever tenancy the request
        // happens to have initialized (SEAL uploads from the central host with none resolved).
        $attachment->tenant_id = $this->tenant_id;
        $attachment->save();

        return $attachment;
    }
}
