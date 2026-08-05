<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Self-service profile management (§9): name/designation/contact, avatar upload, password
 * change. Every authenticated user (officer or citizen) may edit their own profile.
 */
class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('upazila'));
    }

    public function update(Request $request): UserResource
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'name_en' => ['sometimes', 'nullable', 'string', 'max:120'],
            'designation' => ['sometimes', 'nullable', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->fill($data)->save();

        return new UserResource($user->load('upazila'));
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (! $user->password || ! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['বর্তমান পাসওয়ার্ড সঠিক নয়।'],
            ]);
        }

        $user->password = $data['password'];
        $user->save();

        return response()->json(['message' => 'পাসওয়ার্ড পরিবর্তন হয়েছে।']);
    }

    public function updateAvatar(Request $request): UserResource
    {
        $user = $request->user();

        $request->validate([
            'avatar' => ['required', 'image', 'max:4096'], // 4 MB
        ]);

        // Tenant-scoped path so a single upazila's files stay grouped for future export.
        $dir = 'avatars/'.($user->tenant_id ?? 'central');
        $path = $request->file('avatar')->store($dir, 'public');

        $user->avatar_path = $path;
        $user->save();

        return new UserResource($user->load('upazila'));
    }
}
