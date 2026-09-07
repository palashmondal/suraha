# সুরাহা — Suraha

**Smart Upazila – Responsive, Accessible and Humane Administration**

A module-based, multi-tenant government service-delivery platform for Bangladesh upazilas, built for
**SEAL Foundation**. One Bangla-language site per upazila (served on a subdomain) that digitizes
frontline officer work and citizen services — with an automated **pregnancy → BDRIS birth-certificate**
pipeline at its core.

- **What & why:** [SURAHA_OVERVIEW.md](docs/SURAHA_OVERVIEW.md) — business model, roles, features, flows.
- **Full build spec:** [SURAHA_BUILD_PROMPT.md](docs/SURAHA_BUILD_PROMPT.md) — the authoritative spec.
- **Status & remaining work:** [TODO.md](docs/TODO.md) — milestone audit and the ordered work list.
- **Design source of truth:** [`concept_ui/`](concept_ui/) + Figma
  (https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app).

## Monorepo layout

```
suraha/
├── web/          React + Vite + MUI (Material 3) PWA — the frontend (Bangla-only, light + dark)
├── api/          Laravel REST API — Sanctum (Bearer), stancl/tenancy, role-based access
├── mobile/       Ionic React + Capacitor Android app — offline-first FWA field capture
├── infra/        Docker Compose + Caddy reverse proxy (on-demand TLS per subdomain)
├── scripts/      dev.sh — runs api + web + Caddy and syncs /etc/hosts from the domains table
├── concept_ui/   Design reference screenshots
├── docs/         Documentation (overview, build spec, plans, deployment guides)
└── scripts/      Deployment and development scripts
```

## Architecture

- **Multi-tenancy** — a single central database; each **upazila is a tenant** resolved from the
  request subdomain (`galachipa.suraha.net` → tenant `galachipa`) via `stancl/tenancy`. A district
  subdomain (`patuakhali.suraha.net`) resolves no tenant and serves the DC dashboard. Tenant rows
  are scoped by a `tenant_id` global scope (no per-tenant databases). Cross-tenant roles (SEAL/DC)
  work on a **central host** and switch upazila in-app via an `X-Upazila` header — without changing
  the URL. `suraha.net` is the only central host (tenant-less):

  | Host | `/` | `/app` |
  |---|---|---|
  | `suraha.net` | The product's own landing page. | The SEAL console. |
  | `{upazila}.suraha.net` | That upazila's citizen site (apply, track, my submissions). | Its officers' app. |
  | `{district}.suraha.net` | → `/app`. | The DC's read-only district dashboard. |

  The split is by **path, not host**: `/` is always the public site and `/app` is always the
  officer app, so a URL means the same thing everywhere. (`admin.suraha.net` was retired when the
  console moved to `/app` — it served the same pages the central host already serves.)
- **Auth** — Bearer-token Sanctum. Officers sign in with username/password; citizens with mobile +
  OTP (behind a mockable SMS gateway).
- **RBAC** — 7 roles enforced server-side: FWA, UP Sochib, UNO, Investigating Officer, DC
  (read-only), SEAL Admin (super-admin), Citizen. See [SURAHA_OVERVIEW.md §4](docs/SURAHA_OVERVIEW.md).
- **Frontend** — React + Vite + MUI, Bangla-only UI with Bangla numerals, installable PWA, and a full
  shared component library (live gallery at `/ui`).

## Features (complete)

| Area | Highlights |
|---|---|
| **Auth & tenancy** | Host-typed login (central / district / upazila), 7-role RBAC, officer + citizen (OTP) login, profile/password/avatar |
| **Admin console (SEAL)** | Provision new upazila instances (tenant + subdomain), instance roster, officer provisioning, in-app upazila switcher |
| **Dashboards** | Per-role dashboards with real data; SEAL aggregate across all upazilas |
| **ডিসি ড্যাশবোর্ড (DC)** | Each district with an instance gets `{district}.suraha.net` — read-only district aggregate, with a switcher to drill into one upazila |
| **প্রসূতি (Pregnancy)** | FWA field capture → Sochib approval → **auto BDRIS birth registration** → downloadable certificate |
| **নবজাতক (Birth)** | Birth-registration list, statuses, certificate download |
| **অভিযোগ (Complaints)** | Full lifecycle: file → schedule → assign investigator → findings → resolve, with timeline |
| **সাক্ষাৎকার (Appointments)** | Citizen booking, UNO approve/reject/schedule |
| **Public site** | Product landing (`suraha.net`) + per-upazila citizen site, complaint/appointment/assistance/suggestion filing, tracking tokens, "my submissions" |
| **Content** | Awareness image sliders + general info (emergency phones, about) |
| **তথ্যচিত্র (Reporting)** | Scope-aware analytics (Recharts), multiple chart types |
| **Notifications** | In-app, role/tenant-scoped bell + full **সকল নোটিফিকেশন** page (mark-read) |
| **Cross-cutting** | Pagination (10/page, shown only when a list overflows), loading/empty states, instance enable/disable |

Verified by 170 Laravel feature tests across `api/tests/Feature/` (auth/tenancy, admin, dashboards,
pregnancy, birth, complaints, appointments, public content, tracking, reporting, notifications).

---

## Administrative data (বিভাগ / জেলা / উপজেলা)

Source of truth is the **Bangladesh National Portal**, not a community dataset:

| Data | Source | Count |
|---|---|---|
| বিভাগ (divisions) | [bangladesh.gov.bd](https://bangladesh.gov.bd/views/upazila-list) | 8 |
| জেলা (districts) | [bangladesh.gov.bd/views/upazila-list](https://bangladesh.gov.bd/views/upazila-list) | 64 |
| উপজেলা (upazilas) | [bangladesh.gov.bd/views/upazila-list](https://bangladesh.gov.bd/views/upazila-list) | 499 |
| ইউনিয়ন (unions) | [bangladesh.gov.bd/views/union-list](https://bangladesh.gov.bd/views/union-list) | 4567 |

Divisions and districts live in `DivisionSeeder` / `DistrictSeeder`; the 4,567 unions are in
[`api/database/data/bd-unions.json`](api/database/data/bd-unions.json), loaded by `UnionRefSeeder`;
the 499 upazilas are in
[`api/database/data/bd-upazilas.json`](api/database/data/bd-upazilas.json), loaded by
`UpazilaRefSeeder`. Bangla spellings follow the portal exactly (নেত্রকোণা, মুন্সীগঞ্জ,
রাঙ্গামাটি পার্বত্য).

**Subdomains come from the government's own naming.** Each upazila's slug is the label from its
gov.bd site — `galachipa.patuakhali.gov.bd` → `galachipa.suraha.net` — so a Suraha address matches
the one citizens already know. Labels that are not unique nationwide are qualified with the
district: every district has a `sadar` (28 use that exact label) and Kaliganj appears in four
districts, so those become `sadar-gazipur`, `kaliganj-gazipur`, and so on. All 499 are unique, and
`AdminUpazilaTest` pins that.

SEAL never types a subdomain: the instance console picks বিভাগ → জেলা → উপজেলা and the slug comes
from the catalogue, with already-provisioned upazilas shown as unavailable.

To refresh after a boundary change, re-run the seeders — they are idempotent:

```bash
cd api && php artisan db:seed --class=DivisionSeeder && php artisan db:seed --class=DistrictSeeder \
  && php artisan db:seed --class=UpazilaRefSeeder && php artisan db:seed --class=UnionRefSeeder
```

---

## Run locally

### 1. Frontend (works standalone)

```bash
cd web
npm install
npm run dev      # http://localhost:5173  (try the light/dark toggle in the top bar)
```

### 2. API

PostgreSQL 17, the same engine the deploy target runs — dev, tests and production no longer differ:

```bash
brew install postgresql@17 && brew services start postgresql@17
psql -d postgres -c "create role suraha login password 'secret' createdb"
createdb -O suraha suraha && createdb -O suraha suraha_test

cd api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate:fresh --seed   # Galachipa + Dumuria (Barishal), officers, DC, SEAL, citizen, demo data
php artisan serve --host=0.0.0.0 --port=8000
php artisan test                   # run the feature suite
```

Officer logins (all password `password`): `admin`, `uno_galachipa`, `fwa_galachipa`,
`tdonto_galachipa`, `dc_patuakhali`, `dc_khulna`. Citizen: mobile + OTP (dev code returned by the API).

### 3. FWA mobile app (optional)

```bash
cd mobile
npm install
npm run dev      # http://localhost:5175 — needs the API up
```

Offline-first Android app for field capture of প্রসূতি records. See
[`mobile/README.md`](mobile/README.md) and [`FWA_MOBILE_APP_PLAN.md`](docs/FWA_MOBILE_APP_PLAN.md).

### 4. Tenant subdomains

The SPA calls the API on the **same host, port 8000**, so the upazila subdomain flows through
automatically. Three ways to resolve subdomains locally:

- **Zero-setup:** use `*.lvh.me` → `galachipa.lvh.me:5173` / `lvh.me:5173` (resolves to
  127.0.0.1 with no config).
- **`/etc/hosts` (simplest for the real domain).** No wildcards in hosts files, so add the central
  host plus one line per provisioned upazila:
  ```bash
  sudo tee -a /etc/hosts <<'EOF'
  127.0.0.1	suraha.net
  127.0.0.1	galachipa.suraha.net
  127.0.0.1	dumuria.suraha.net
  EOF
  ```
  `scripts/dev.sh` does this automatically, reading the `domains` table — rerun it after
  provisioning a new upazila. Then open `http://galachipa.suraha.net:5173`.
- **Real domain, wildcard (`*.suraha.net`)** via dnsmasq — no per-upazila hosts edits:
  ```bash
  brew install dnsmasq
  echo 'address=/suraha.net/127.0.0.1' | sudo tee -a "$(brew --prefix)/etc/dnsmasq.conf"
  sudo brew services start dnsmasq
  sudo mkdir -p /etc/resolver && echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/suraha.net
  ```
  Then open `http://galachipa.suraha.net:5173`. To drop the `:5173`, serve the frontend on port
  80 (e.g. a ServBay/Caddy reverse proxy `*.suraha.net:80 → 127.0.0.1:5173`, or `sudo npx vite
  --host --port 80`). `api/.env` sets `APP_URL`/`ASSET_URL` to `suraha.net` so uploaded assets
  (slider images, avatars) resolve.

---

## Deploy (Docker)

On a VPS. Host-specific runbooks:
[**AWS EC2**](docs/DEPLOY_AWS.md) (Free-plan credits) · [shared cPanel](docs/DEPLOY_CPANEL.md) (build locally, upload two folders) · [laptop demo, no server](docs/DEMO.md) (Cloudflare Tunnel).

**DNS (once).** At the registrar, point both records at the VPS:

```
A    suraha.net      <server-ip>
A    *.suraha.net    <server-ip>
```

**Deploy.** On the VPS (Docker + the compose plugin installed):

```bash
git clone https://github.com/palashmondal/suraha.git && cd suraha/infra
cp .env.example .env                                  # then edit: APP_KEY, DB_PASSWORD, SMS/BDRIS
docker compose build
docker compose run --rm app php artisan key:generate --show   # paste into .env as APP_KEY
docker compose up -d                                  # app, web, postgres, Caddy proxy
docker compose exec app php artisan migrate --force
docker compose exec app php artisan storage:link
```

**Seed reference data + one admin.** Do *not* run `db:seed` bare — `DatabaseSeeder` is the dev
seed and would create demo upazilas and eight officers whose password is `password`. Production
wants the বিভাগ/জেলা/উপজেলা/ইউনিয়ন catalogue and nothing else:

```bash
for s in DivisionSeeder DistrictSeeder UpazilaRefSeeder UnionRefSeeder; do
  docker compose exec app php artisan db:seed --force --class=$s
done

docker compose exec -e SEAL_PASSWORD='pick-a-strong-one' app php artisan tinker --execute="
  App\Models\User::create([
    'name' => 'সুরাহা অ্যাডমিন',
    'username' => 'admin',
    'password' => Illuminate\Support\Facades\Hash::make(getenv('SEAL_PASSWORD')),
    'role' => App\Enums\Role::SEAL_ADMIN->value,
    'is_active' => true,
  ]);"
```

Then sign in at `https://suraha.net/app` as `admin` and provision the first upazila from the
console — its subdomain starts serving immediately, no server change.

Four services, no more: **app** (Laravel on FrankenPHP, :8080), **web** (the built SPA on :80),
**postgres**, and the **Caddy** proxy on :80/:443. There is no Redis, queue worker, scheduler or
MinIO — nothing in the app queues, schedules, or writes to S3, so those would be idle containers.
Uploads (slider images, avatars, certificates) sit on Laravel's public disk, kept by the `uploads`
volume; the database is kept by `pgdata`.

**Updating.** `./scripts/deploy.sh` — pulls, rebuilds, restarts, migrates, recaches config and
routes. Volumes are untouched.

The app resolves the upazila (tenant) from the request host, so one Caddy site block serves the
central host and every upazila. Adding a new upazila in the admin console needs **no server
change** — wildcard DNS plus on-demand TLS cover every new subdomain automatically.

**TLS is issued per hostname, on demand.** The first request to `kalapara.suraha.net` makes Caddy
fetch a certificate for it over HTTP-01 and cache it — no wildcard cert, so no DNS-01 challenge,
no DNS provider API token, and no custom Caddy build. It works regardless of who hosts DNS.

Before issuing, Caddy asks the API whether the hostname is real
([`GET /api/tls/allowed`](api/app/Http/Controllers/RegistryController.php) → `RegistryController@tlsAllowed`),
which answers 2xx only for the central host and provisioned, active upazilas. **That gate is not
optional:** without it, anyone pointing a hostname at the server could exhaust the Let's Encrypt
rate limits.

## License

See [LICENSE](LICENSE).
