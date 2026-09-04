<?php

namespace App\Providers;

use App\Services\Bdris\BdrisGateway;
use App\Services\Bdris\MockBdrisGateway;
use App\Models\Setting;
use App\Services\Sms\AlphaSmsGateway;
use App\Services\Sms\LogSmsGateway;
use App\Services\Sms\SmsGateway;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind the configured SMS gateway (OTP delivery only — §10). Swap `log` for a real
        // adapter here once SEAL provisions provider credentials.
        $this->app->bind(SmsGateway::class, function () {
            return match (config('sms.gateway')) {
                // Setting first, .env as the fallback: an admin rotating the key on the SMS
                // সেটিংস page must not need a redeploy.
                'alpha' => new AlphaSmsGateway(
                    (string) Setting::get('sms.alpha.api_key', config('sms.alpha.api_key')),
                    Setting::get('sms.alpha.sender_id', config('sms.alpha.sender_id')),
                    (string) config('sms.alpha.endpoint'),
                    (int) config('sms.alpha.timeout'),
                ),
                default => new LogSmsGateway(),
            };
        });

        // Swappable BDRIS gateway (§10). Swap `mock` for a real adapter once access is granted.
        $this->app->bind(BdrisGateway::class, function () {
            return match (config('bdris.driver')) {
                default => new MockBdrisGateway(),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
