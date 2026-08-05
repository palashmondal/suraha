<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Stancl\Tenancy\Events;
use Stancl\Tenancy\Exceptions\NotASubdomainException;
use Stancl\Tenancy\Listeners;
use Stancl\Tenancy\Middleware;

/**
 * Single-database tenancy provider.
 *
 * Unlike the stock stancl stub, we do NOT wire the CreateDatabase / MigrateDatabase /
 * DeleteDatabase job pipelines: Suraha uses one central database and scopes tenant-owned
 * rows via the BelongsToTenant global scope (see config/tenancy.php bootstrappers). We keep
 * the initialize/revert listeners so tenant() is set/cleared as requests enter and leave a
 * tenant (subdomain) context.
 */
class TenancyServiceProvider extends ServiceProvider
{
    public static string $controllerNamespace = '';

    public function events(): array
    {
        return [
            Events\TenancyInitialized::class => [
                Listeners\BootstrapTenancy::class,
            ],
            Events\TenancyEnded::class => [
                Listeners\RevertToCentralContext::class,
            ],
        ];
    }

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->bootEvents();
        $this->mapRoutes();
        $this->makeTenancyMiddlewareHighestPriority();
        $this->configureSubdomainFallback();
    }

    /**
     * Make the subdomain middleware tolerant of central/localhost requests: a request on a
     * central domain (SEAL/DC admin, or localhost during dev) proceeds WITHOUT a tenant, while
     * an unknown upazila subdomain returns 404. This lets us apply the `tenant` middleware
     * across the whole API and still serve cross-tenant (SEAL) endpoints.
     */
    protected function configureSubdomainFallback(): void
    {
        Middleware\InitializeTenancyBySubdomain::$onFail = function ($e, $request, $next) {
            if ($e instanceof NotASubdomainException) {
                return $next($request); // central context
            }

            abort(404, 'উপজেলা খুঁজে পাওয়া যায়নি।'); // unknown subdomain
        };
    }

    protected function bootEvents(): void
    {
        foreach ($this->events() as $event => $listeners) {
            foreach ($listeners as $listener) {
                Event::listen($event, $listener);
            }
        }
    }

    protected function mapRoutes(): void
    {
        $this->app->booted(function () {
            if (file_exists(base_path('routes/tenant.php'))) {
                Route::namespace(static::$controllerNamespace)
                    ->group(base_path('routes/tenant.php'));
            }
        });
    }

    protected function makeTenancyMiddlewareHighestPriority(): void
    {
        $tenancyMiddleware = [
            Middleware\PreventAccessFromCentralDomains::class,
            Middleware\InitializeTenancyByDomain::class,
            Middleware\InitializeTenancyBySubdomain::class,
            Middleware\InitializeTenancyByDomainOrSubdomain::class,
            Middleware\InitializeTenancyByPath::class,
            Middleware\InitializeTenancyByRequestData::class,
        ];

        foreach (array_reverse($tenancyMiddleware) as $middleware) {
            $this->app[\Illuminate\Contracts\Http\Kernel::class]->prependToMiddlewarePriority($middleware);
        }
    }
}
