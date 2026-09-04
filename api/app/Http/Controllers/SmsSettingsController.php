<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Setting;
use App\Models\SmsMessage;
use App\Models\Upazila;
use App\Models\User;
use App\Services\Sms\AlphaSmsGateway;
use App\Services\Sms\SmsGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * SMS সেটিংস (§10) — the account behind every OTP and decision message: what is left on it, what
 * Suraha has spent, and the credential itself.
 *
 * The SMS account is platform-wide, not per-upazila, so these figures are deliberately unscoped:
 * an OTP is sent before anyone has logged in and belongs to no tenant.
 */
class SmsSettingsController extends Controller
{
    /** How far back the usage chart looks. */
    private const DAYS = 30;

    /** What a test says when the sender types nothing of their own. */
    public const DEFAULT_TEST_MESSAGE = 'সুরাহা: এটি একটি টেস্ট SMS। SMS সেটিংস সঠিকভাবে কাজ করছে।';

    public function show(Request $request, SmsGateway $gateway): JsonResponse
    {
        $key = (string) Setting::get('sms.alpha.api_key', config('sms.alpha.api_key'));

        return response()->json([
            'gateway' => config('sms.gateway'),
            'provider' => [
                'name' => 'Alpha SMS',
                'url' => 'https://www.alpha.net.bd/SMS/',
                'panel_url' => 'https://sms.net.bd/',
                'recharge_url' => 'https://sms.net.bd/recharge',
            ],
            // Never the key itself — the page only needs to show that one is set, and which.
            'api_key_masked' => $key === '' ? null : mb_substr($key, 0, 4).str_repeat('•', 8).mb_substr($key, -4),
            'sender_id' => Setting::get('sms.alpha.sender_id', config('sms.alpha.sender_id')),
            'default_test_message' => self::DEFAULT_TEST_MESSAGE,
            'balance' => $gateway instanceof AlphaSmsGateway ? $gateway->balance() : null,
            'usage' => $this->usage($request->user()),
        ]);
    }

    /** SEAL: paste a new key. One account serves every upazila, so this is not a UNO's to change. */
    public function update(Request $request, SmsGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'api_key' => ['nullable', 'string', 'max:191'],
            // A masked sender is a GSM alphanumeric field: Latin letters and digits, at most 11
            // characters, and approved by the provider first. Bangla is rejected at the gateway
            // with "Invalid Sender ID" — after the send has been attempted — so it is refused here.
            'sender_id' => ['nullable', 'string', 'regex:/^[A-Za-z0-9]{1,11}$/'],
        ], [
            'sender_id.regex' => 'সেন্ডার আইডি ইংরেজি অক্ষর ও সংখ্যায়, সর্বোচ্চ ১১ অক্ষরের হতে হবে (যেমন SURAHA) এবং প্রোভাইডারের অনুমোদন থাকতে হবে।',
        ]);

        if (array_key_exists('api_key', $data) && filled($data['api_key'])) {
            Setting::put('sms.alpha.api_key', $data['api_key']);
        }

        if (array_key_exists('sender_id', $data)) {
            Setting::put('sms.alpha.sender_id', $data['sender_id']);
        }

        // Rebuild the gateway so the reply reflects the key just saved, not the one booted with.
        app()->forgetInstance(SmsGateway::class);

        return $this->show($request, app(SmsGateway::class));
    }

    /**
     * Which upazila spent the credit. One provider account serves every subdomain, so without
     * this the bill cannot be attributed to anyone.
     *
     * SEAL sees every upazila; a UNO sees only their own — the account is shared, but another
     * upazila's traffic is not their business.
     *
     * @return array<int, array<string, mixed>>
     */
    private function byTenant(?User $user): array
    {
        $central = config('tenancy.central_domains.0', 'suraha.net');

        $rows = SmsMessage::query()
            ->when(
                $user && $user->role !== Role::SEAL_ADMIN,
                fn ($q) => $q->where('tenant_id', $user?->tenant_id),
            )
            ->groupBy('tenant_id')
            ->orderByDesc(DB::raw('sum(parts)'))
            ->get([
                'tenant_id',
                DB::raw('count(*) as total'),
                DB::raw('sum(parts) as parts'),
                DB::raw('sum(case when sent then 1 else 0 end) as sent'),
            ]);

        $names = Upazila::whereIn('id', $rows->pluck('tenant_id')->filter())->pluck('name_bn', 'id');

        return $rows->map(fn ($r) => [
            'tenant_id' => $r->tenant_id,
            // Null means the send happened on the central host, with no upazila resolved.
            'name' => $r->tenant_id ? ($names[$r->tenant_id] ?? $r->tenant_id) : 'কেন্দ্রীয়',
            'subdomain' => $r->tenant_id ? $r->tenant_id.'.'.$central : $central,
            'total' => (int) $r->total,
            'parts' => (int) $r->parts,
            'sent' => (int) $r->sent,
            'failed' => (int) ($r->total - $r->sent),
        ])->all();
    }

    /**
     * SEAL: send one real message, to prove the key works and to see whether the masked sender
     * actually reaches the handset. Costs credit, which is why it is not a UNO's button.
     */
    public function test(Request $request, SmsGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^01[0-9]{9}$/'],
            'message' => ['nullable', 'string', 'max:500'],
        ], [
            'phone.regex' => 'মোবাইল নাম্বার ০১ দিয়ে শুরু হয়ে ১১ সংখ্যার হতে হবে।',
        ]);

        $sender = Setting::get('sms.alpha.sender_id', config('sms.alpha.sender_id'));
        $message = trim((string) ($data['message'] ?? '')) !== ''
            ? trim((string) $data['message'])
            : self::DEFAULT_TEST_MESSAGE;

        $gateway->send($data['phone'], $message, 'test');

        // send() never throws, so the outcome is read back off the log row it just wrote.
        $result = SmsMessage::where('purpose', 'test')->latest('id')->first();

        return response()->json([
            'sent' => (bool) $result?->sent,
            'error' => $result?->error,
            'message' => $message,
            // What it actually cost: Bangla is Unicode, so 70 characters per part.
            'parts' => $result?->parts ?? SmsMessage::partsFor($message),
            // What the recipient will see as the sender — the point of the test.
            'sender_id' => $sender ?: null,
            'settings' => $this->show($request, $gateway)->getData(true),
        ]);
    }

    /**
     * Counts from our own send log — the provider reports a balance but not what it went on.
     *
     * @return array<string, mixed>
     */
    private function usage(?User $user = null): array
    {
        $since = Carbon::today()->subDays(self::DAYS - 1);

        $daily = SmsMessage::query()
            ->where('created_at', '>=', $since)
            ->groupBy('day')
            ->orderBy('day')
            ->get([
                DB::raw('date(created_at) as day'),
                DB::raw('count(*) as total'),
                DB::raw('sum(case when sent then 1 else 0 end) as sent'),
                DB::raw('sum(parts) as parts'),
            ])
            ->keyBy(fn ($r) => (string) $r->day);

        // Every day in the window, so the chart has no gaps where nothing was sent.
        $series = collect(range(0, self::DAYS - 1))->map(function (int $i) use ($since, $daily) {
            $day = $since->clone()->addDays($i)->toDateString();
            $row = $daily->get($day);

            return [
                'date' => $day,
                'total' => (int) ($row->total ?? 0),
                'sent' => (int) ($row->sent ?? 0),
                'failed' => (int) (($row->total ?? 0) - ($row->sent ?? 0)),
                'parts' => (int) ($row->parts ?? 0),
            ];
        })->all();

        return [
            'days' => self::DAYS,
            'series' => $series,
            'total' => SmsMessage::count(),
            'sent' => SmsMessage::where('sent', true)->count(),
            'failed' => SmsMessage::where('sent', false)->count(),
            // Parts, not messages: a Bangla message over 70 characters is billed more than once.
            'parts' => (int) SmsMessage::where('sent', true)->sum('parts'),
            'by_purpose' => SmsMessage::query()
                ->groupBy('purpose')
                ->orderByDesc('total')
                ->get(['purpose', DB::raw('count(*) as total'), DB::raw('sum(parts) as parts')])
                ->map(fn ($r) => [
                    'purpose' => $r->purpose,
                    'label' => (new SmsMessage(['purpose' => $r->purpose]))->labelBn(),
                    'total' => (int) $r->total,
                    'parts' => (int) $r->parts,
                ])->all(),
            'by_tenant' => $this->byTenant($user),
            'recent_failures' => SmsMessage::where('sent', false)
                ->whereNotNull('error')
                ->latest('id')
                ->limit(5)
                ->get(['phone', 'error', 'created_at'])
                ->map(fn ($r) => [
                    'phone' => $r->phone,
                    'error' => $r->error,
                    'at' => $r->created_at?->toDateTimeString(),
                ])->all(),
        ];
    }
}
