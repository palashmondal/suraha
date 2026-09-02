<?php

namespace App\Http\Controllers\Auth;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Otp\OtpService;
use App\Support\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

// Citizen registration/login with mobile + OTP (SURAHA_BUILD_PROMPT §1.1(3)). A citizen account is
// created on first successful verification; filing a complaint/appointment requires it (§1.1(6)).
class CitizenAuthController extends Controller
{
    public function __construct(private OtpService $otp) {}

    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string', 'regex:/^01\d{9}$/'],
        ]);

        // Throttle to blunt SMS abuse: a few sends per number per window.
        $key = 'otp:'.$data['mobile'];
        if (RateLimiter::tooManyAttempts($key, 3)) {
            throw ValidationException::withMessages([
                'mobile' => ['অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'],
            ]);
        }
        RateLimiter::hit($key, 600); // 10-minute window

        $this->otp->issue($data['mobile']);

        return response()->json(['ok' => true]);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string', 'regex:/^01\d{9}$/'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        if (! $this->otp->verify($data['mobile'], $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['যাচাই কোডটি সঠিক নয় বা মেয়াদ শেষ।'],
            ]);
        }

        RateLimiter::clear('otp:'.$data['mobile']);

        // Create the citizen on first login, scoped to the upazila resolved from the subdomain.
        $user = User::firstOrCreate(
            ['mobile' => $data['mobile'], 'role' => Role::Citizen->value],
            [
                'name' => 'নাগরিক',
                'designation' => Role::Citizen->label(),
                'upazila_id' => Tenant::id(),
                'is_active' => true,
            ],
        );

        $user->loadMissing('upazila.district');
        $token = $user->createToken('pwa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ]);
    }
}
