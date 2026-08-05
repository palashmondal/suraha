<?php

namespace App\Providers;

use App\Services\Bdris\BdrisGateway;
use App\Services\Bdris\MockBdrisGateway;
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
