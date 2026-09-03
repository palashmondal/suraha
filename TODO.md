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

## 2. Milestone status — FWA mobile app

Phases 0–5 of [`FWA_MOBILE_APP_PLAN.md`](FWA_MOBILE_APP_PLAN.md) §9 are complete and typecheck
clean. **Phase 6 (harden & ship) has not started** — there is no `android/` platform directory, no
signing keystore, no APK, and the app has never run on a device.

---

## 3. Work list — in order

### 3.0 Housekeeping (do first, ~5 min)

Sandbox blocked me from deleting files; these are yours to run.

**a. Delete the Ionic starter test boilerplate.** `mobile/cypress/e2e/test.cy.ts` is the generator's
"My First Test" asserting `'Ready to create an app?'` — it fails if run and tests nothing.
`mobile/src/setupTests.ts` imports `@testing-library/jest-dom/extend-expect`, a jest-dom v5 path
that does not work with vitest's `expect`, plus a `matchMedia` shim nothing needs.

```bash
cd mobile && rm -rf cypress cypress.config.ts src/setupTests.ts
```

Then drop `"test.e2e"` from `package.json` scripts, `cypress` from `devDependencies`, and the
`setupFiles: './src/setupTests.ts'` line from `vite.config.ts`; `npm install` to refresh the lock.
Keep the vitest block — Phase 6 needs it.

**b. Remove the stale git worktree** left over from an old session (a full second copy of the repo
on disk):

```bash
git worktree remove --force .claude/worktrees/brave-swanson-fc27d1 && git worktree prune
```

**c. Drop the history-rewrite backup refs** once you've confirmed the rewritten history looks right
on GitHub:

```bash
git update-ref -d refs/original/refs/heads/feat/suraha-platform && git reflog expire --expire=now --all && git gc --prune=now
```

A full pre-rewrite backup is at `../suraha-pre-rewrite-backup.bundle` — delete it when you're
satisfied (`git clone suraha-pre-rewrite-backup.bundle` restores everything).

**d. Commit the pending mobile route fix** already in the working tree (`/mother/new` →
`/add-mother`, so `IonRouterOutlet` can't match it against `/mother/:id`).

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

### 3.2 Ship the FWA mobile app (Phase 6)

The biggest remaining chunk, and the one thing blocking the pilot.

1. **Answer the three open questions** in [`FWA_MOBILE_APP_PLAN.md`](FWA_MOBILE_APP_PLAN.md) §11 —
   they change plugin and packaging choices, so settle them before adding the platform:
   can an FWA switch upazila; minimum Android version; app identity/branding.
2. **Add the Android platform**: `npm run build && npx cap add android && npx cap sync android`.
   Commit `android/` (it is a real source directory, not build output).
3. **On-device QA** against a real API host: first-run upazila pick → login → add a mother offline
   → airplane mode → reconnect → confirm one record, not two (the `client_uuid` path).
4. **Encrypt local storage** — Dexie/IndexedDB is plaintext in the WebView today, and these are
   named pregnancy records. Either field-encrypt before write or move to Capacitor SQLite +
   SQLCipher as the plan originally specified. This is the one item here that is not cosmetic.
5. **Empty/error/loading states + Bangla and accessibility polish** across the five screens.
6. **Sign and distribute**: generate a release keystore, build a signed APK, side-load for the
   pilot. Do not commit the keystore or its passwords.
7. **First tests**: the vitest block is wired but unused. One test on the sync engine's outbox drain
   (`src/lib/sync.ts`) — the 4xx-drops-the-op vs 5xx-retries branch is the part that will break
   silently and lose a mother's record.

### 3.3 Widen test coverage

The API is well covered (123 tests); the two frontends are not (6 tests, all on the web outbox).

1. `web/`: cover `SyncProvider`'s submit-or-queue and flush-on-reconnect paths, and `ScopeResolver`'s
   frontend mirror in the reports filters.
2. `mobile/`: the sync-engine test from §3.2.7.
3. Neither needs a framework beyond what is installed.

### 3.4 Production readiness

Deferred by choice so far — schedule against the real launch date, not before.

1. **Real BDRIS gateway** — one class implementing `BdrisGateway`, bound in `AppServiceProvider`
   behind `config('bdris.driver')`. `MockBdrisGateway` stays for tests and dev.
2. **Real SMS gateway** — same shape, `SmsGateway` / `config('sms.gateway')`. Needed before
   citizens can log in anywhere but dev.
3. **Audit logging** — never built. Decide whether the pilot needs it; if so, an Eloquent observer
   over the mutable models is enough, not a package.
4. **Secrets & deploy** — fill `infra/.env` from `.env.example`, confirm the `/api/tls/allowed` gate
   answers correctly for a hostname that is *not* provisioned (this is what protects the Let's
   Encrypt rate limit), and run the seeders on the production database.

### 3.5 Nice to have

- The 4,567-union catalogue is sourced from a community dataset joined to the gov.bd upazila list,
  not from the portal directly (see `UnionRefSeeder`'s docblock). Re-verify against
  `bangladesh.gov.bd/views/union-list` before launch if union names matter legally.
- `mobile/` duplicates `web/`'s Bangla strings and API client by design (531 lines total). Do **not**
  extract a shared package for this — the duplication is smaller than the workspace tooling would be.
  Revisit only if a third client appears.
