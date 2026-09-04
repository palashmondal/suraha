<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Assistance;
use App\Models\Complaint;
use App\Models\Suggestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * সংযুক্তি upload for the three citizen submissions. One endpoint rather than three near-identical
 * controller methods — the file handling is the same in every case, only the parent model differs.
 *
 * The public forms post their fields first (that path is offline-queueable JSON) and the files
 * straight after, against the id they get back.
 */
class AttachmentController extends Controller
{
    private const MODELS = [
        'complaints' => Complaint::class,
        'assistances' => Assistance::class,
        'suggestions' => Suggestion::class,
    ];

    public function store(Request $request, string $resource, int $id): JsonResponse
    {
        $record = self::MODELS[$resource]::findOrFail($id);

        // A citizen may only attach to their own submission; officers to any in their upazila.
        $user = $request->user();
        if ($user->role === Role::CITIZEN) {
            abort_unless($record->citizen_id === $user->id, 403);
        }

        $request->validate([
            'files' => ['required', 'array', 'max:10'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
        ], [
            // PHP drops an oversized file before the app sees it and Laravel reports `uploaded`,
            // whose default message names no cause — which reads as a broken button.
            'files.*.uploaded' => 'ফাইলটি আপলোড করা যায়নি। সার্ভারের সর্বোচ্চ আপলোড সীমার চেয়ে বড় ফাইল গ্রহণ করা যায় না।',
            'files.*.max' => 'প্রতিটি ফাইল সর্বোচ্চ ১০ MB হতে পারে।',
            'files.*.mimes' => 'ছবি (JPG, PNG, WEBP) বা PDF ফাইল সংযুক্ত করা যাবে।',
        ]);

        foreach ($request->file('files') as $file) {
            $record->attachFile($file);
        }

        return response()->json([
            'attachments' => $record->attachments()->get()
                ->map(fn ($a) => ['url' => $a->url(), 'original_name' => $a->original_name, 'kind' => $a->kind])
                ->all(),
        ], 201);
    }
}
