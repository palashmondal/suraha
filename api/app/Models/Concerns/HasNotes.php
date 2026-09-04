<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Gives a record the officer's running notes. Adding notes to a new module is this trait plus a
 * pair of routes — no migration, no model.
 */
trait HasNotes
{
    /** Oldest first — the detail page reads them as a timeline. */
    public function notes(): MorphMany
    {
        // By id, not created_at: two notes written in the same second must still read in the
        // order they were added.
        return $this->morphMany(Note::class, 'notable')->oldest('id');
    }

    /**
     * A note belongs to its record's upazila — never to whatever tenancy the request happens to
     * have initialized. SEAL reads a detail page from the central "সকল উপজেলা" view with no
     * tenant resolved, where BelongsToTenant would leave tenant_id null.
     */
    public function addNote(string $body, ?User $author): Note
    {
        $note = $this->notes()->make(['body' => $body, 'author_id' => $author?->id]);
        $note->tenant_id = $this->tenant_id;
        $note->save();

        return $note;
    }
}
