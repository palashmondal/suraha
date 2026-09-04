<?php

declare(strict_types=1);

namespace App\Services\Sms;

use App\Models\SmsMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Alpha SMS (sms.net.bd) — one POST, one key, a JSON body whose `error` is 0 on success.
 *
 * Deliberately never throws. An SMS is a notification about work that has already happened: the
 * সাক্ষাৎকার is already approved and saved by the time this runs, so a gateway outage must not
 * turn a successful decision into a 500 for the UNO. Failures are logged and swallowed.
 *
 * @see https://www.alpha.net.bd/SMS/api/
 */
class AlphaSmsGateway implements SmsGateway
{
    public function __construct(
        private readonly string $apiKey,
        private readonly ?string $senderId = null,
        private readonly string $endpoint = 'https://api.sms.net.bd/sendsms',
        private readonly int $timeout = 10,
    ) {}

    public function send(string $phone, string $message, string $purpose = 'other'): void
    {
        // Logged whatever happens — the SMS সেটিংস usage figures are built from these rows, and a
        // failed send is exactly the thing an admin needs to see.
        $log = SmsMessage::create([
            'tenant_id' => tenancy()->initialized ? tenant()->getTenantKey() : null,
            'purpose' => $purpose,
            'phone' => $phone,
            'parts' => SmsMessage::partsFor($message),
        ]);

        try {
            $response = Http::asForm()
                ->timeout($this->timeout)
                ->post($this->endpoint, array_filter([
                    'api_key' => $this->apiKey,
                    'to' => self::msisdn($phone),
                    'msg' => $message,
                    'sender_id' => $this->senderId,
                ]));

            $body = $response->json();

            // The gateway answers 200 even when it refuses the message; `error` is the real result.
            if (($body['error'] ?? -1) !== 0) {
                $reason = (string) ($body['msg'] ?? $response->body());
                $log->update(['error' => mb_substr($reason, 0, 250)]);
                Log::warning('SMS not sent', ['to' => $phone, 'error' => $body['error'] ?? null, 'msg' => $reason]);

                return;
            }

            $log->update(['sent' => true]);
            Log::info('SMS sent', ['to' => $phone, 'request_id' => $body['data']['request_id'] ?? null]);
        } catch (Throwable $e) {
            // A timeout or DNS failure must not take the request down with it.
            $log->update(['error' => mb_substr($e->getMessage(), 0, 250)]);
            Log::warning('SMS gateway unreachable', ['to' => $phone, 'error' => $e->getMessage()]);
        }
    }

    /**
     * What is left on the account. Returns null when the provider cannot be reached, so the
     * settings page can say "unavailable" rather than "0".
     *
     * @return array{balance: float, validity: ?string}|null
     */
    public function balance(): ?array
    {
        try {
            $body = Http::timeout($this->timeout)
                ->get('https://api.sms.net.bd/user/balance/', ['api_key' => $this->apiKey])
                ->json();

            if (($body['error'] ?? -1) !== 0) {
                return null;
            }

            return [
                'balance' => (float) ($body['data']['balance'] ?? 0),
                'validity' => $body['data']['validity'] ?? null,
            ];
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * The gateway wants 8801XXXXXXXXX. Records here hold 01XXXXXXXXX, and a citizen may type
     * +880 or spaces, so everything is folded to the one shape it accepts.
     */
    public static function msisdn(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($digits, '880')) {
            return $digits;
        }

        return '880'.ltrim($digits, '0');
    }
}
