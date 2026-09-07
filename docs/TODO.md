# সুরাহা — Status & remaining work

Last audited: 2026-09-03, against `feat/suraha-platform`.
Evidence: `php artisan test` → **123 passing**, `npm run test` (web) → **6 passing**,
`npx tsc --noEmit` (mobile) → clean.

---

## 1. Milestone status — platform

| # | Milestone | State | Evidence |
|---|---|---|---|
| M0 | Repo, tooling, Docker/Caddy infra | ✅ | `infra/`, `scripts/dev.sh` |
| M1 | Design system + shared components | ✅ | `web/src/components/`, live gallery at `/ui` |
| M2 | Auth, RBAC, multi-tenancy | ✅ | `AuthTenancyTest`, 6 middleware in `bootstrap/app.php` |
| M3 | Per-role dashboards + SEAL/DC aggregate | ✅ | `DashboardTest`, `ScopeResolver` |
| M4 | প্রসূতি → জন্ম নিবন্ধন → BDRIS certificate | ✅ | `PregnancyTest`, `BirthRegistrationTest` |
| M5 | অভিযোগ full lifecycle | ✅ | `ComplaintTest`, `ComplaintEvent` timeline |
| M6 | সাক্ষাৎকার (appointments) | ✅ | `AppointmentTest` |
| M7 | Public site, tracking tokens, upazila provisioning | ✅ | `TrackingTest`, `AdminUpazilaTest` |
| M8 | Content — sliders + general info | ✅ | `PublicContentTest` |
| M9 | Reporting & analytics | ⚠️ **charts done, exports stubbed** | `ReportTest`; see [§3.1](#31-report-exports) |
| M10 | In-app notifications | ✅ | `NotificationTest` |
| — | মানবিক সহায়তা + নাগরিক পরামর্শ | ✅ | `AssistanceAndSuggestionTest` |
| — | Officer management (UNO + SEAL) | ✅ | `OfficerManagementTest` |
| — | District/DC subdomain topology | ✅ | `ResolveHost`, on-demand TLS in `infra/Caddyfile` |
| — | Offline outbox + `client_uuid` idempotency | ✅ | `web/src/offline/`, all 5 submit endpoints dedup |

**Not built at all (deliberately deferred, no code exists):** audit logging, Web Push
notifications, real BDRIS credentials, real SMS provider.

**Changed 2026-09-04:**
- **PostgreSQL everywhere.** The SQLite dev database is retired: `api/.env`, `.env.example` and
  `phpunit.xml` all point at Postgres 17 (`suraha` / `suraha_test`), so tests run on the engine
  production runs. Fallout fixed in the move: every list/search `LIKE` became `ILIKE` (Postgres
  `LIKE` is case-sensitive, which silently broke English-name search), one test that assumed
  auto-increment ids restart per test (Postgres does not roll sequences back), and `scripts/dev.sh`
  now asks `php artisan suraha:hosts` for the subdomain list instead of reading the SQLite file.
  `api/database/database.sqlite` is now unused — delete it when you are happy with the switch.
- **Within-upazila visibility** (`app/Models/Scopes/RoleVisibilityScope.php`): an **FWA** sees only
  the প্রসূতি records they entered; a **ইউপি সচিব** sees only their own union's. Applied as a global
  scope, so it holds on lists, tab counts, search, route-model binding, the certificate download
  and the approve action alike. UNO/DC/SEAL are unchanged. The web no longer offers a সচিব the
  "নতুন প্রসূতি" form the API would have refused.
- **The সচিব's certificate form.** "জন্ম নিবন্ধন তৈরি করুন" now opens the জন্ম নিবন্ধন সনদ as a
  form — child, mother, father, place and permanent address — prefilled from the mother's record by
  `GET /api/pregnancies/{id}/birth-registration-draft`, blank where she never gave a value, every
  field editable, and a **বিডিআরআইএস-এ জমা দিন** button at the bottom. What the সচিব files is what
  the certificate prints (`birth_registrations` gained the English names, parent NID/BRN,
  nationalities, place of birth and permanent address). Reopening a filed pregnancy shows the
  number instead of a second form, because approval is idempotent.
- **Birth registration number on the mother's record** — `birth_registration_no` on
  `PregnancyResource`, so the FWA who entered her (and the UNO and DC) can read the number the
  সচিব's BDRIS filing returned, without access to the জন্ম নিবন্ধন module.

## 2. Milestone status — mobile app

Phases 0–6 of [`FWA_MOBILE_APP_PLAN.md`](FWA_MOBILE_APP_PLAN.md) §9 are coded, typecheck clean, and
5 vitest tests pass. **Phase 6 is code-complete but not shipped**: everything that can be done
without an Android SDK is done (platform committed, records encrypted, signing wired, states and
tests) — the APK build and on-device QA need a machine with JDK 21 + the Android SDK. See
[§3.2](#32-ship-the-mobile-app-phase-6).

**Scope change (2026-09-04):** this is now **one app for all roles** — UNO, DC, সচিব, FWA, নাগরিক —
role-gated after login, not an FWA-only app. The identity was changed before `android/` was
committed (`net.suraha.app`, "সুরাহা"), because changing an `appId` later forces a reinstall for
every pilot user. The FWA প্রসূতি workflow is what v1 ships; the other roles' screens are
[§3.6](#36-other-roles-in-the-mobile-app).

---

## 3. Work list — in order

### 3.0 Housekeeping

✅ Done. The Ionic starter test boilerplate is deleted (and `vitest` bumped to ^2.1.9 to match
`web/`), the stale worktree and history-rewrite refs are gone, and the mobile route fix is
committed. The pre-rewrite backup bundle at `../suraha-pre-rewrite-backup.bundle` is the one thing
left — delete it when you're satisfied with the rewritten history on GitHub.

### 3.1 Report exports

The only incomplete platform feature. Both buttons in
[`web/src/pages/reports/Reports.tsx`](web/src/pages/reports/Reports.tsx) currently just raise a
toast.

1. Add `GET /api/reports/export?format=pdf|xlsx` to `ReportController`, reusing `ScopeResolver` so
   the export honours the same tenant / district / global scope as the charts.
2. PDF: reuse the existing certificate PDF stack (see `BirthRegistrationController@downloadCertificate`).
   Excel: add `maatwebsite/excel`, or emit CSV and skip the dependency if CSV is acceptable.
3. Wire both buttons to the endpoint; the Bangla labels already exist as `S.reports.exportPdf` /
   `exportExcel`.
4. Extend `ReportTest` with one case per format asserting the scope filter is applied.

### 3.2 Ship the mobile app (Phase 6)

Done in code — `mobile/README.md` carries the build and signing commands:

- ✅ **§11 questions settled**: upazila switching stays (already in Settings); **minSdk 28**
  (Android 9+); identity is **"সুরাহা" / `net.suraha.app`** — deliberately role-neutral, see §2.
- ✅ **`android/` added and committed** with `@capacitor/android` 8.5.0. Manifest carries the
  geolocation + network permissions the plugins need, and `allowBackup="false"` so named pregnancy
  records can't ride a Google backup off the device. iOS stays out of scope (no side-loading).
- ✅ **Encryption at rest**: every §8.1 field is AES-GCM encrypted into one `enc` blob before it
  reaches IndexedDB (`src/lib/crypto.ts`, `src/lib/db.ts`); only sync bookkeeping stays readable.
  The key is generated per install and held in the **Android Keystore**
  (`@aparajita/capacitor-secure-storage`) — which now also holds the Bearer token that was sitting
  in plain Preferences.
- ✅ **States & a11y**: the list distinguishes loading / store-unreadable / empty / no-search-match
  instead of flashing "no records"; a missing record no longer renders a blank page; icon-only
  buttons carry `aria-label`s.
- ✅ **Release signing** reads a gitignored `android/keystore.properties`; without it the release
  build still runs and just produces an unsigned APK.
- ✅ **First tests**: 5 vitest cases — the outbox drain (4xx drops the op and flags the record, 5xx
  keeps it queued and stops the pass, success records the `server_id`) and the crypto round-trip.

**Yours to run** (needs JDK 21 + Android SDK, neither is on this machine):

1. `cd mobile && npm run android && npx cap open android`, then Run on a device.
2. **On-device QA**: first-run upazila pick → login → add a mother offline → airplane mode →
   reconnect → confirm **one** record, not two (the `client_uuid` path).
3. Generate the release keystore, write `android/keystore.properties`, `./gradlew assembleRelease`,
   side-load. Do not commit the keystore or its passwords.
4. Replace the placeholder launcher icon
   (`android/app/src/main/res/drawable/ic_launcher_foreground.xml`) with the designed one.

### 3.3 Widen test coverage

The API is well covered (123 tests); the frontends are thinner (web 6, mobile 5).

1. `web/`: cover `SyncProvider`'s submit-or-queue and flush-on-reconnect paths, and `ScopeResolver`'s
   frontend mirror in the reports filters.
2. ✅ `mobile/`: the sync-engine outbox-drain test landed with §3.2.
3. Neither needs a framework beyond what is installed.

### 3.4 Production readiness

Deferred by choice so far — schedule against the real launch date, not before.

1. **Real BDRIS gateway** — one class implementing `BdrisGateway`, bound in `AppServiceProvider`
   behind `config('bdris.driver')`. `MockBdrisGateway` stays for tests and dev. The parents' NID and
   birth-registration numbers are now captured on the প্রসূতি record (2026-09-04) and reachable from
   `$reg->pregnancy`; what a real certificate still shows and we do not store: **English spellings**
   of the child/mother/father names, **nationality** (constant বাংলাদেশী), **place of birth**,
   **permanent address** (we hold one present-address line), and the **registration / issuance
   dates** and registrar names, which BDRIS itself issues.
2. **Real SMS gateway** — same shape, `SmsGateway` / `config('sms.gateway')`. Needed before
   citizens can log in anywhere but dev.
3. **Audit logging** — never built. Decide whether the pilot needs it; if so, an Eloquent observer
   over the mutable models is enough, not a package.
4. **Secrets & deploy** — fill `infra/.env` from `.env.example`, confirm the `/api/tls/allowed` gate
   answers correctly for a hostname that is *not* provisioned (this is what protects the Let's
   Encrypt rate limit), and run the seeders on the production database.

### 3.6 Other roles in the mobile app

The app ships with the FWA workflow only; UNO / DC / সচিব / নাগরিক screens are the next chunk after
the pilot APK. What already generalises: the shell, the outbox, encryption, and officer login
(`POST /auth/officer/login` works for every officer role, and `/auth/me` returns the role). What
does not, and needs deciding before building:

1. **Citizens log in by OTP**, not username/password — a second login path, and citizen records are
   scoped to a person, not an upazila roster.
2. **DC / SEAL are not upazila-scoped**, but the app pins its API base to an upazila subdomain. DC
   needs the district host; SEAL is global. The first-run picker has to branch on that, or the app
   has to resolve the host after login instead of before it.
3. **Which modules each role gets on mobile** — the web app has ten; the phone does not need all of
   them, and picking the field-useful subset is a product call, not a technical one.

### 3.5 Nice to have

- The 4,567-union catalogue is sourced from a community dataset joined to the gov.bd upazila list,
  not from the portal directly (see `UnionRefSeeder`'s docblock). Re-verify against
  `bangladesh.gov.bd/views/union-list` before launch if union names matter legally.
- `mobile/` duplicates `web/`'s Bangla strings and API client by design (531 lines total). Do **not**
  extract a shared package for this — the duplication is smaller than the workspace tooling would be.
  Revisit only if a third client appears.
