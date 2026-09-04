<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Models\Note;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * The officer-notes half of a module's controller. সাক্ষাৎকার, মানবিক সহায়তা and নাগরিক পরামর্শ
 * had — or would have had — the same two methods word for word.
 */
trait ManagesNotes
{
    /** Keep a dated note. Notes accumulate; none replaces another, and the citizen is not told. */
    protected function storeNote(Request $request, Model $record): void
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        $record->addNote($data['body'], $request->user());
    }

    /** Drop a note written in error, scoped to its own record so an id from another cannot be used. */
    protected function destroyNote(Model $record, Note $note): void
    {
        abort_unless(
            $note->notable_id === $record->getKey() && $note->notable_type === $record->getMorphClass(),
            404,
        );

        $note->delete();
    }
}
