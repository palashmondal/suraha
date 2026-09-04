<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\Sms\AlphaSmsGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/** Alpha SMS (sms.net.bd). Http::fake throughout — a real send costs money. */
class SmsGatewayTest extends TestCase
{
    // send() now writes an sms_messages row for the usage figures, so this class touches the
    // database. Without the trait those writes escaped the per-test transaction and left the
    // connection in a state the next class's rollback could not unwind.
    use RefreshDatabase;

    private function gateway(): AlphaSmsGateway
    {
        return new AlphaSmsGateway('test-key', 'SURAHA', 'https://api.sms.net.bd/sendsms');
    }

    public function test_local_numbers_are_sent_in_the_form_the_gateway_wants(): void
    {
        // Records hold 01XXXXXXXXX; a citizen may type +880 or spaces. All must reach the same shape.
        $this->assertSame('8801712345678', AlphaSmsGateway::msisdn('01712345678'));
        $this->assertSame('8801712345678', AlphaSmsGateway::msisdn('+880 1712-345678'));
        $this->assertSame('8801712345678', AlphaSmsGateway::msisdn('8801712345678'));
    }

    public function test_a_message_is_posted_with_the_key_and_sender(): void
    {
        Http::fake(['api.sms.net.bd/*' => Http::response(['error' => 0, 'msg' => 'ok', 'data' => ['request_id' => 42]])]);

        $this->gateway()->send('01712345678', 'সুরাহা: পরীক্ষা');

        Http::assertSent(fn ($r) => $r['api_key'] === 'test-key'
            && $r['to'] === '8801712345678'
            && $r['msg'] === 'সুরাহা: পরীক্ষা'
            && $r['sender_id'] === 'SURAHA');
    }

    /**
     * The decision is already saved by the time the SMS goes out, so a refusal or an outage must
     * not turn a successful approval into a 500 for the UNO.
     */
    public function test_a_refusal_is_logged_and_swallowed(): void
    {
        // The gateway answers 200 even when it refuses; `error` carries the real result.
        Http::fake(['api.sms.net.bd/*' => Http::response(['error' => 416, 'msg' => 'No sufficient balance'])]);
        Log::spy();

        $this->gateway()->send('01712345678', 'সুরাহা: পরীক্ষা');

        Log::shouldHaveReceived('warning')->once();
    }

    public function test_an_unreachable_gateway_is_swallowed_too(): void
    {
        Http::fake(fn () => throw new \RuntimeException('connection timed out'));
        Log::spy();

        $this->gateway()->send('01712345678', 'সুরাহা: পরীক্ষা');

        Log::shouldHaveReceived('warning')->once();
    }
}
