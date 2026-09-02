# সুরাহা API (Laravel)

REST API for the Suraha PWA. See [`../SURAHA_BUILD_PROMPT.md`](../SURAHA_BUILD_PROMPT.md) for the full spec.

## Setup

```bash
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite       # default DB is sqlite; point .env at Postgres for the real stack
php artisan migrate:fresh --seed     # creates the tenant registry + one officer per role + a demo citizen
php artisan serve                    # http://localhost:8000
php artisan test                     # auth + RBAC feature/unit tests
```

## Milestone 2 — Auth, RBAC & tenancy (done)

- **Roles** (`app/Enums/Role.php`): fwa, sochib, uno, investigator, dc, seal, citizen — values match the PWA.
- **Tenancy**: in-app scoping by `upazila_id` on a central DB (subdomain → `upazilas.subdomain`), resolved by
  `ResolveTenant`; a local PWA sends `X-Suraha-Tenant`. `BelongsToTenant` scopes module models; DC/SEAL are cross-tenant.
- **RBAC**: `role:uno,seal` gates routes; `can.write` blocks DC (read-only) from mutating requests.
- **Auth** (Sanctum tokens): officers by username/password, citizens by mobile + OTP (SMS behind a swappable
  `SmsSender`, OTP-only).

### Endpoints

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/officer/login` | officers → `{token, user}` |
| POST | `/api/auth/citizen/otp` | citizens (request code) |
| POST | `/api/auth/citizen/verify` | citizens → `{token, user}` |
| GET | `/api/auth/me` | authenticated |
| POST | `/api/auth/logout` | authenticated |

### Demo credentials (after seeding)

Officers log in with password **`password`** and username `fwa` / `sochib` / `uno` / `investigator` / `dc` / `seal`.
The demo citizen is mobile **`01700000000`** (tenant `golachipa`). To log a citizen in without a live SMS
gateway, set `SURAHA_OTP_BYPASS=000000` in `.env` and use that as the code.

---

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
