# সুরাহা — Suraha

Module-based government service-delivery platform for Bangladesh upazilas (SEAL Foundation).

- **What & why:** [SURAHA_OVERVIEW.md](SURAHA_OVERVIEW.md) — business model, features, flows.
- **Full build spec:** [SURAHA_BUILD_PROMPT.md](SURAHA_BUILD_PROMPT.md) — the authoritative agent spec.
- **Design source of truth:** [`concept_ui/`](concept_ui/) + Figma
  (https://www.figma.com/design/eywg5k7XOILjdYc7Gzarqm/Suraha-app). **Never invent UI.**

## Monorepo layout

```
suraha/
├── web/          React + Vite + MUI (MD3) PWA  — the frontend
├── api/          Laravel REST API              — Sanctum, stancl/tenancy, Horizon
├── infra/        Docker Compose + reverse proxy (wildcard TLS *.suraha.com.bd)
├── concept_ui/   Design reference screenshots
└── SURAHA_*.md   Overview + build prompt
```

## Build status

**Milestone 0 (scaffold) + Milestone 1 (design system + shell) — done.** Stopped here for review
per request. Implemented so far:

- **Design tokens + MUI theme** (`web/src/theme/`) — violet primary, per-module accents
  (purple/charcoal/green/maroon), semantic status pills, soft-lavender canvas; **light + dark**.
- **App shell** (`web/src/layout/`) — sidebar (icons, sections কর্মকর্তা / সাধারণ তথ্য, expandable
  children, active lavender pill) per `concept_ui/Side Navigations.png`; top bar with **upazila
  switcher**, **notification bell**, **theme toggle**, profile (name + role).
- **Dashboard** (`web/src/pages/Dashboard.tsx`) — 3 module summary cards over 3 list cards
  (সাক্ষাৎকার / অভিযোগ / স্লাইডার ইমেজ) per `concept_ui/Dashboard.png`, with sample data.
- **Bangla-only UI** with Bangla numerals (`web/src/i18n.ts`, `web/src/utils/bnNum.ts`).
- **PWA** manifest + service-worker precache wired (`web/vite.config.ts`); offline queue + Background
  Sync land with the pregnancy module (Milestone 4).
- **API** scaffolded with Sanctum (`install:api`), `stancl/tenancy`, Horizon, `predis/predis`.
- **infra/** Docker Compose (app, web, worker, scheduler, postgres, redis, minio, Caddy proxy).

> Note: `composer create-project` installed **Laravel 13** (current release), not 11 as the doc
> text says. Functionally equivalent for this stack; update the doc if you want the version pinned.

## Run the frontend (works now)

```bash
cd web
npm install
npm run dev      # http://localhost:5173  — try the light/dark toggle in the top bar
```

Production build (also generates the PWA service worker):

```bash
cd web && npm run build
```

## Run the API (needs PostgreSQL + Redis)

The Laravel scaffold defaults to SQLite. For the real stack, point `api/.env` at PostgreSQL + Redis:

```bash
cd api
php artisan key:generate
php artisan migrate
php artisan serve         # http://localhost:8000
```

Tenancy, RBAC, and auth wiring are **Milestone 2** (not built yet).

## Deploy (Docker — not installed on this machine)

```bash
cd infra
cp .env.example .env      # set DB/S3/BDRIS/SMS secrets
docker compose up -d      # app, web, postgres, redis, worker, scheduler, minio, proxy
```

The Caddy proxy terminates **wildcard TLS for `*.suraha.com.bd`**; the app resolves the upazila
(tenant) from the request host.

## Next milestones (see SURAHA_BUILD_PROMPT §13)

2. Auth & multi-tenancy (subdomain resolution, RBAC, officer accounts, profiles)
3. Per-role dashboards + SEAL aggregate + DC district switcher
4. Pregnancy module + BDRIS → birth certificate  ·  5. Complaints  ·  6. Appointments
7. Public site  ·  8. Sliders & general info  ·  9. Reporting  ·  10. Notifications + polish
