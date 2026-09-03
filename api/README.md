# সুরাহা — API (Laravel)

The Suraha backend: a multi-tenant REST API where **one upazila = one tenant**, resolved from the
request host. Serves the [`web/`](../web) PWA and the [`mobile/`](../mobile) FWA app from the same
endpoints. See [`../SURAHA_BUILD_PROMPT.md`](../SURAHA_BUILD_PROMPT.md) for the product spec.

## Commands

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed      # Galachipa + Dumuria, officers, DC, SEAL, citizen, demo data
php artisan serve --host=0.0.0.0 --port=8000
php artisan test                      # 123 feature tests
```

Dev defaults to SQLite (`database/database.sqlite`); production uses PostgreSQL via
[`infra/`](../infra). Seed logins (password `password`): `admin` (SEAL), `uno_galachipa`,
`fwa_galachipa`, `tdonto_galachipa`, `dc_patuakhali`, `dc_khulna`. Citizens log in with mobile + OTP
(the dev SMS gateway returns the code in the response).

## Request lifecycle

Every `/api/*` route (except the TLS gate) passes through this middleware chain, aliased in
[`bootstrap/app.php`](bootstrap/app.php):

| Alias | Class | What it does |
|---|---|---|
| `host` | `ResolveHost` | Types the request host: **central** (`suraha.net`), **district** (`patuakhali.suraha.net` → DC dashboard, no tenant), or **upazila** (`galachipa.suraha.net` → initializes the tenant). An unknown subdomain 404s. |
| `tenant.active` | `EnsureTenantActive` | A disabled upazila's subdomain serves only the "disabled" notice. |
| `tenant.selected` | `ApplySelectedTenant` | Lets cross-tenant roles (SEAL, DC) switch upazila with an `X-Upazila` header instead of changing the URL. |
| `tenant.access` | `EnsureTenantAccess` | A token is only valid for upazilas its owner may reach — this is what stops cross-tenant reads. |
| `role` | `EnsureRole` | RBAC allow-list per route, e.g. `role:uno,seal_admin`. |
| `deny.readonly` | `DenyReadOnlyWrites` | Blocks every mutation from a read-only role (DC), regardless of what else a route allows. |

Auth is **Bearer-token Sanctum** — no cookies, no CSRF. Tenant rows carry a `tenant_id` with a
global scope (single central database, no per-tenant databases).

## Roles

Seven roles in [`app/Enums/Role.php`](app/Enums/Role.php), which also carries the RBAC facts the
middleware reads (`isReadOnly()`, `scope()`, `isCrossTenant()`):

| Role | Bangla | Scope | Notes |
|---|---|---|---|
| `fwa` | পরিবার কল্যাণ সহকারী | own upazila | Field capture of প্রসূতি records |
| `up_sochib` | ইউপি সচিব | own upazila | Approves deliveries → birth registration |
| `uno` | উপজেলা নির্বাহী কর্মকর্তা | own upazila | Decides complaints, appointments, assistance, suggestions |
| `investigating_officer` | তদন্ত কর্মকর্তা | own assignments | Files complaint findings |
| `dc` | জেলা প্রশাসক | own district | **Read-only** oversight |
| `seal_admin` | সুরাহা অ্যাডমিন | all | Provisions upazila instances and officers |
| `citizen` | নাগরিক | own submissions | OTP login; files complaints/appointments/assistance/suggestions |

## Endpoint map

Full definitions with per-route RBAC in [`routes/api.php`](routes/api.php).

| Group | Prefix | Auth |
|---|---|---|
| TLS gate for Caddy on-demand certs | `GET /api/tls/allowed` | none (internal, called by the proxy) |
| Host/registry lookups (host context, upazila directory, unions, districts, divisions) | `registry/*`, `upazilas/directory` | none |
| Officer + citizen login | `auth/officer/login`, `auth/citizen/request-otp`, `auth/citizen/verify-otp` | none |
| Public status lookup by tracking token | `GET track/{token}` | none, throttled 20/min |
| Public awareness content | `sliders`, `general-info` | none |
| Session, dashboard, reports, notifications, profile | `auth/me`, `dashboard/stats`, `reports`, `notifications*`, `profile*` | any role |
| প্রসূতি | `pregnancies*` | read: upazila officers + DC/SEAL · write: FWA/SEAL |
| জন্ম নিবন্ধন | `birth-registrations*`, `pregnancies/{id}/approve` | read: Sochib/UNO/DC/SEAL · write: Sochib/SEAL |
| অভিযোগ | `complaints*` | file: citizen/UNO · manage: UNO · report: investigator |
| সাক্ষাৎকার · মানবিক সহায়তা · নাগরিক পরামর্শ | `appointments*`, `assistances*`, `suggestions*` | submit: citizen/UNO · decide: UNO |
| Unified search | `GET search` | FWA/Sochib/UNO/SEAL |
| Officer & content management | `officers*`, `users`, `investigating-officers*`, `manage/sliders*`, `manage/general-info*` | SEAL + UNO (own upazila) |
| Instance provisioning | `upazilas*` | SEAL only |

## Layout

```
app/
├── Enums/        Role + per-module status enums (the state machines live here)
├── Models/       Eloquent models; tenant models apply the tenant_id global scope
├── Http/
│   ├── Middleware/   Host typing, tenancy, RBAC (table above)
│   ├── Controllers/  One per module; Admin/ and Auth/ subgroups
│   └── Resources/    JSON shaping — the contract web/ and mobile/ consume
├── Services/
│   ├── Bdris/    Birth-registration gateway behind BdrisGateway; MockBdrisGateway in dev
│   └── Sms/      OTP delivery behind SmsGateway; LogSmsGateway in dev
└── Support/
    ├── ScopeResolver.php    Which upazilas a request aggregates over (tenant/district/global)
    ├── TrackingToken.php    Public tracking tokens for citizen submissions
    └── CertificateAssets.php  Seal/logo assets for the BDRIS certificate PDF

database/
├── migrations/   Schema, including the tenancy and client_uuid additions
├── seeders/      Administrative catalogue (divisions/districts/upazilas/unions) + demo activity
├── factories/    Test data
└── data/         bd-upazilas.json (499) and bd-unions.json from the national portal
```

## Swappable gateways

Both external integrations sit behind an interface, with a dev implementation bound in
[`app/Providers/AppServiceProvider.php`](app/Providers/AppServiceProvider.php):

- **BDRIS** (`Services/Bdris/`) — `MockBdrisGateway` issues registration numbers locally so the
  প্রসূতি → জন্ম নিবন্ধন → certificate chain runs end to end without the real service. Config in
  [`config/bdris.php`](config/bdris.php).
- **SMS/OTP** (`Services/Sms/`) — `LogSmsGateway` writes the OTP to the log and returns it in the
  dev response. Config in [`config/sms.php`](config/sms.php).

Wiring a real provider means one new class per interface, no controller changes.

## Offline idempotency

Both clients can submit while offline and replay later, so creates accept an optional
`client_uuid`. A replay with a `client_uuid` that already exists returns the **existing** record
instead of creating a duplicate. Implemented for pregnancies, complaints, appointments,
assistances and suggestions; covered by feature tests.

## Tests

`php artisan test` — 123 feature tests in [`tests/Feature/`](tests/Feature) covering auth/tenancy,
admin/instance provisioning, officer management, dashboards, pregnancy, birth registration,
complaints, appointments, assistance + suggestions, public content, tracking, reporting and
notifications. `AdminUpazilaTest` also pins that all 499 upazila slugs are unique.
