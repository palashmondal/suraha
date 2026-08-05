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

**Milestone 0 (scaffold) — done. Milestone 1 (Foundation) — done.** Design tokens, app shell, and
the full shared component library are in place (light + dark, Bangla).

Implemented so far:

- **Design tokens + MUI theme** (`web/src/theme/`) — violet primary, per-module accents
  (purple/charcoal/green/maroon), semantic status pills, soft-lavender canvas; **light + dark**.
- **App shell** (`web/src/layout/`) — sidebar (icons, sections কর্মকর্তা / সাধারণ তথ্য, expandable
  children, active lavender pill) per `concept_ui/Side Navigations.png`; top bar with **upazila
  switcher**, **notification bell**, **theme toggle**, profile (name + role).
- **Dashboard** (`web/src/pages/Dashboard.tsx`) — 3 module summary cards over 3 list cards
  (সাক্ষাৎকার / অভিযোগ / স্লাইডার ইমেজ) per `concept_ui/Dashboard.png`, with sample data.
- **Shared component library** (`web/src/components/`) — cards (`ModuleSummaryCard`, `SectionCard`,
  `StatTile`), `StatusPill`, `NotificationMenu`, `PageHeader`, `TableTabs` + `DataTable` + `RowMenu`
  (Bangla headers, status-pill cells, kebab menu, "N new" badges), `EmptyState`, `AppDialog` +
  `ConfirmDialog`, `VerticalStepper`, `StatusTimeline`, `SummaryPanel`, `SectionTitle`, `DetailRow`,
  and form fields (`form/` — `FieldCard`, `FormField`, `SelectField`, `DateField`, `TimeField`,
  `RadioGroupField`, `FileDropzone`). Live gallery at **`/ui`** (concept_ui-faithful, both themes).
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

**Milestone 2 (Auth & Multi-tenancy) — done.** Subdomain → upazila resolution (`stancl/tenancy`,
single central DB with `tenant_id` global scoping), 7-role RBAC enforced server-side (DC read-only,
SEAL cross-tenant), **Bearer-token** Sanctum auth for officers (username/password) and citizens
(mobile + OTP behind a mockable SMS gateway), profile management (edit / password / avatar), and
SEAL officer-provisioning. Verified by `tests/Feature/AuthTenancyTest.php` (13 cases).

**Admin console (SEAL super-admin):** the SEAL admin works on a single **admin host**
(`admin.suraha.com.bd`, dev `admin.lvh.me`) and can **provision new upazila instances**
(new tenant + subdomain) and review the roster of instances (`/instances` UI, `GET|POST /api/upazilas`).
The top-bar **upazila switcher** now actually switches context: for cross-tenant roles (SEAL/DC) it
sends the picked upazila as an `X-Upazila` header and the API scopes to it **without changing the URL
host**; tenant-scoped officers (UNO/FWA/Sochib/…) have no switcher. Verified by
`tests/Feature/AdminUpazilaTest.php` (10 cases). Seed:

```bash
cd api
php artisan migrate:fresh --seed   # Golachipa + Dumuria (Barishal), officers, DC, SEAL, citizen
php artisan serve                  # officer login: admin / uno_golachipa / … (password: "password")
php artisan test                   # run the M2 suite
```

Dev subdomains resolve via `{upazila}.lvh.me` (→ 127.0.0.1, no hosts edits). The SPA points at the
same host on port 8000 so the tenant subdomain flows through automatically.

## Deploy (Docker — not installed on this machine)

```bash
cd infra
cp .env.example .env      # set DB/S3/BDRIS/SMS secrets
docker compose up -d      # app, web, postgres, redis, worker, scheduler, minio, proxy
```

The Caddy proxy terminates **wildcard TLS for `*.suraha.com.bd`**; the app resolves the upazila
(tenant) from the request host.

## Next milestones (see SURAHA_BUILD_PROMPT §13)

3. Per-role dashboards + SEAL aggregate + DC district switcher
4. Pregnancy module + BDRIS → birth certificate  ·  5. Complaints  ·  6. Appointments
7. Public site  ·  8. Sliders & general info  ·  9. Reporting  ·  10. Notifications + polish
