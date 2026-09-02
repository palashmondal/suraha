<?php

namespace Tests\Unit;

use App\Http\Middleware\EnsureCanWrite;
use App\Http\Middleware\EnsureRole;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

// RBAC middleware logic (SURAHA_BUILD_PROMPT §3), exercised without the HTTP stack or a database.
class RbacMiddlewareTest extends TestCase
{
    private function request(string $method, User $user): Request
    {
        $request = Request::create('/x', $method);
        $request->setUserResolver(fn () => $user);

        return $request;
    }

    private function user(string $role): User
    {
        return new User(['role' => $role]);
    }

    public function test_ensure_role_allows_listed_role(): void
    {
        $passed = false;
        (new EnsureRole)->handle($this->request('GET', $this->user('uno')), function () use (&$passed) {
            $passed = true;

            return response('ok');
        }, 'uno', 'seal');

        $this->assertTrue($passed);
    }

    public function test_ensure_role_blocks_unlisted_role(): void
    {
        try {
            (new EnsureRole)->handle($this->request('GET', $this->user('fwa')), fn () => response('ok'), 'uno');
            $this->fail('Expected a 403 HttpException.');
        } catch (HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
    }

    public function test_dc_may_read_but_not_write(): void
    {
        $mw = new EnsureCanWrite;

        // Safe method passes.
        $passed = false;
        $mw->handle($this->request('GET', $this->user('dc')), function () use (&$passed) {
            $passed = true;

            return response('ok');
        });
        $this->assertTrue($passed);

        // Mutating method is blocked.
        try {
            $mw->handle($this->request('POST', $this->user('dc')), fn () => response('ok'));
            $this->fail('Expected a 403 HttpException.');
        } catch (HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
    }

    public function test_non_readonly_role_may_write(): void
    {
        $passed = false;
        (new EnsureCanWrite)->handle($this->request('POST', $this->user('uno')), function () use (&$passed) {
            $passed = true;

            return response('ok');
        });

        $this->assertTrue($passed);
    }
}
