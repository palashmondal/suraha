<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Sms\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Officer login — admin-created username + password (§1.1(3)). Returns a Bearer token.
     * If the request arrives on an upazila subdomain, the officer must be allowed there.
     */
    public function officerLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $data['username'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['ভুল ইউজারনেম বা পাসওয়ার্ড।'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => ['এই অ্যাকাউন্টটি নিষ্ক্রিয়।'],
            ]);
        }

        // If resolved on a tenant subdomain, the officer must have access to that upazila.
        if (tenancy()->initialized && ! $user->canAccessTenant(tenant()->getTenantKey())) {
            throw ValidationException::withMessages([
                'username' => ['এই উপজেলায় আপনার প্রবেশাধিকার নেই।'],
            ]);
        }

        return $this->tokenResponse($user, 'officer');
    }

    /**
     * Citizen step 1 — request an OTP for a mobile number. Requires an upazila (subdomain)
     * context, since a citizen account is tied to the subdomain they register under (§7).
     */
    public function requestOtp(Request $request, OtpService $otp): JsonResponse
    {
        $this->requireTenant();

        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^01[0-9]{9}$/'],
        ]);

        $devCode = $otp->issue($data['phone']);

        return response()->json([
            'message' => 'ওটিপি পাঠানো হয়েছে।',
            'dev_code' => $devCode, // null in production
        ]);
    }

    /**
     * Citizen step 2 — verify OTP; create the account on first login. Returns a Bearer token.
     */
    public function verifyOtp(Request $request, OtpService $otp): JsonResponse
    {
        $this->requireTenant();

        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^01[0-9]{9}$/'],
            'code' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        if (! $otp->verify($data['phone'], $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['ওটিপি সঠিক নয় বা মেয়াদ শেষ।'],
            ]);
        }

        $user = User::firstOrNew([
            'phone' => $data['phone'],
            'role' => Role::CITIZEN->value,
        ]);

        if (! $user->exists) {
            $user->name = $data['name'] ?? 'নাগরিক';
            $user->tenant_id = tenant()->getTenantKey();
        }

        $user->phone_verified_at = now();
        $user->is_active = true;
        $user->save();

        return $this->tokenResponse($user, 'citizen');
    }

    /**
     * Current authenticated user.
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('upazila'));
    }

    /**
     * Revoke the token used to authenticate this request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'লগআউট সম্পন্ন হয়েছে।']);
    }

    // ---- helpers ---------------------------------------------------------

    private function tokenResponse(User $user, string $tokenName): JsonResponse
    {
        $token = $user->createToken($tokenName, [$user->role->value])->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user->load('upazila')),
        ]);
    }

    private function requireTenant(): void
    {
        if (! tenancy()->initialized) {
            abort(400, 'উপজেলা নির্ধারণ করা যায়নি। সঠিক সাবডোমেইন ব্যবহার করুন।');
        }
    }
}
