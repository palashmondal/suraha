# সুরাহা — Suraha

**Smart Upazila – Responsive, Accessible and Humane Administration**

A module-based, multi-tenant government service-delivery platform for Bangladesh upazilas, built for
**SEAL Foundation**. One Bangla-language site per upazila (served on a subdomain) that digitizes
frontline officer work and citizen services — with an automated **pregnancy → BDRIS birth-certificate**
pipeline at its core.

- **What & why:** [SURAHA_OVERVIEW.md](SURAHA_OVERVIEW.md) — business model, roles, features, flows.
- **Full build spec:** [SURAHA_BUILD_PROMPT.md](SURAHA_BUILD_PROMPT.md) — the authoritative spec.
- **Design source of truth:** [`concept_ui/`](concept_ui/) + Figma
  (https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app).

## Monorepo layout

```
suraha/
├── web/          React + Vite + MUI (Material 3) PWA — the frontend (Bangla-only, light + dark)
├── api/          Laravel REST API — Sanctum (Bearer), stancl/tenancy, role-based access
├── infra/        Docker Compose + Caddy reverse proxy (wildcard TLS *.suraha.com.bd)
├── concept_ui/   Design reference screenshots
└── SURAHA_*.md   Overview + build prompt
```

## Architecture

- **Multi-tenancy** — a single central database; each **upazila is a tenant** resolved from the
  request subdomain (`golachipa.suraha.com.bd` → tenant `golachipa`) via `stancl/tenancy`. Tenant rows
  are scoped by a `tenant_id` global scope (no per-tenant databases). Cross-tenant roles (SEAL/DC)
  work on the **admin host** (`admin.suraha.com.bd`) and switch upazila in-app via an `X-Upazila`
  header — without changing the URL.
- **Auth** — Bearer-token Sanctum. Officers sign in with username/password; citizens with mobile +
  OTP (behind a mockable SMS gateway).
- **RBAC** — 7 roles enforced server-side: FWA, UP Sochib, UNO, Investigating Officer, DC
  (read-only), SEAL Admin (super-admin), Citizen. See [SURAHA_OVERVIEW.md §4](SURAHA_OVERVIEW.md).
- **Frontend** — React + Vite + MUI, Bangla-only UI with Bangla numerals, installable PWA, and a full
  shared component library (live gallery at `/ui`).

## Features (complete)

| Area | Highlights |
|---|---|
| **Auth & tenancy** | Subdomain→upazila resolution, 7-role RBAC, officer + citizen (OTP) login, profile/password/avatar |
| **Admin console (SEAL)** | Provision new upazila instances (tenant + subdomain), instance roster, officer provisioning, in-app upazila switcher |
| **Dashboards** | Per-role dashboards with real data; SEAL/DC aggregate + district roll-up |
| **প্রসূতি (Pregnancy)** | FWA field capture → Sochib approval → **auto BDRIS birth registration** → downloadable certificate |
| **নবজাতক (Birth)** | Birth-registration list, statuses, certificate download |
| **অভিযোগ (Complaints)** | Full lifecycle: file → schedule → assign investigator → findings → resolve, with timeline |
| **সাক্ষাৎকার (Appointments)** | Citizen booking, UNO approve/reject/schedule |
| **Public site** | Landing page, complaint/appointment filing, tracking tokens, "my submissions" |
| **Content** | Awareness image sliders + general info (emergency phones, about) |
| **তথ্যচিত্র (Reporting)** | Scope-aware analytics (Recharts), multiple chart types |
| **Notifications** | In-app, role/tenant-scoped bell + full **সকল নোটিফিকেশন** page (mark-read) |
| **Cross-cutting** | Global pagination (10/20/30/50/all), loading/empty states, listing-page polish |

Verified by ~80 Laravel feature tests across `api/tests/Feature/` (auth/tenancy, admin, dashboards,
pregnancy, birth, complaints, appointments, public content, tracking, reporting, notifications).

---

## Run locally

### 1. Frontend (works standalone)

```bash
cd web
npm install
npm run dev      # http://localhost:5173  (try the light/dark toggle in the top bar)
```

### 2. API

Defaults to SQLite for dev (no PostgreSQL needed to try it):

```bash
cd api
composer install
php artisan key:generate
php artisan migrate:fresh --seed   # Golachipa + Dumuria (Barishal), officers, DC, SEAL, citizen, demo data
php artisan serve --host=0.0.0.0 --port=8000
php artisan test                   # run the feature suite
```

Officer logins (all password `password`): `admin`, `uno_golachipa`, `fwa_golachipa`,
`tdonto_golachipa`, … Citizen: mobile + OTP (dev code returned by the API).

### 3. Tenant subdomains

The SPA calls the API on the **same host, port 8000**, so the upazila subdomain flows through
automatically. Two ways to resolve subdomains locally:

- **Zero-setup:** use `*.lvh.me` → `golachipa.lvh.me:5173` / `admin.lvh.me:5173` (resolves to
  127.0.0.1 with no config).
- **Real domain (`*.suraha.com.bd`)** via a dnsmasq wildcard:
  ```bash
  brew install dnsmasq
  echo 'address=/suraha.com.bd/127.0.0.1' | sudo tee -a "$(brew --prefix)/etc/dnsmasq.conf"
  sudo brew services start dnsmasq
  sudo mkdir -p /etc/resolver && echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/suraha.com.bd
  ```
  Then open `http://golachipa.suraha.com.bd:5173`. To drop the `:5173`, serve the frontend on port
  80 (e.g. a ServBay/Caddy reverse proxy `*.suraha.com.bd:80 → 127.0.0.1:5173`, or `sudo npx vite
  --host --port 80`). `api/.env` sets `APP_URL`/`ASSET_URL` to `suraha.com.bd` so uploaded assets
  (slider images, avatars) resolve.

---

## Deploy (Docker)

```bash
cd infra
cp .env.example .env      # set DB/S3/BDRIS/SMS secrets
docker compose up -d      # app, web, postgres, redis, worker, scheduler, minio, Caddy proxy
```

The Caddy proxy terminates **wildcard TLS for `*.suraha.com.bd`**; the app resolves the upazila
(tenant) from the request host. Adding a new upazila in the admin console needs **no server change** —
wildcard DNS + vhost + cert cover every new subdomain automatically.

## License

See [LICENSE](LICENSE).
