<?php

namespace App\Providers;

use App\Services\Sms\LogSmsSender;
use App\Services\Sms\SmsSender;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // SMS gateway is swappable per config (SURAHA_BUILD_PROMPT §8, §1.1(8)). Only the log/mock
        // driver ships now; a real gateway driver implements SmsSender and is selected here.
        $this->app->singleton(SmsSender::class, function () {
            return match (config('suraha.sms.driver', 'log')) {
                default => new LogSmsSender,
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
