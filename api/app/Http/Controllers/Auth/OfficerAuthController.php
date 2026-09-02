<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

// Officer/DC/SEAL login with admin-created username + password (SURAHA_BUILD_PROMPT §1.1(3)).
class OfficerAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('username', $data['username'])
            ->where('role', '!=', 'citizen')
            ->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['ব্যবহারকারীর নাম বা পাসওয়ার্ড সঠিক নয়।'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => ['এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।'],
            ]);
        }

        $user->loadMissing('upazila.district', 'district');
        $token = $user->createToken('pwa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): UserResource
    {
        $user = $request->user();
        $user->loadMissing('upazila.district', 'district');

        return new UserResource($user);
    }
}
