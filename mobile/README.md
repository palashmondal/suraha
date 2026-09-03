# Suraha FWA — mobile app

Offline-first Android app (Ionic React + Capacitor) for the FWA (পরিবার কল্যাণ সহকারী) to register
প্রসূতি (expecting mother) records in the field and sync them to the Suraha backend. See the full
design in [`../FWA_MOBILE_APP_PLAN.md`](../FWA_MOBILE_APP_PLAN.md).

## Status against the plan's phases

| Phase | State |
|---|---|
| 0 — Scaffold | ✅ Ionic React + Capacitor project, theme, dev server |
| 1 — Connect & auth | ✅ Upazila directory + picker, FWA login, Bearer token in Preferences |
| 2 — Local data layer | ✅ Dexie (IndexedDB) `mothers` + `outbox`, connectivity service |
| 3 — Core workflow | ✅ My Mothers list, Add Mother 3-step stepper, GPS |
| 4 — Sync engine | ✅ Outbox drain, `client_uuid` idempotency, badges, auto + manual sync |
| 5 — Delivery & edit | ✅ Mother detail, edit, delivery confirmation (queued) |
| 6 — Harden & ship | ⬜ **Not started** — no `android/` platform yet, no APK, no on-device QA |

> The plan calls for Capacitor SQLite; this is built on **Dexie/IndexedDB** instead, which runs
> unchanged in both the browser dev build and the Android WebView. That choice defers SQLCipher
> encryption to Phase 6 — see [`src/lib/db.ts`](src/lib/db.ts).

## What's built
- First-run **upazila picker** (`GET /api/upazilas/directory` on the central host) → pins the API
  base to `https://{slug}.suraha.net/api`, so backend tenancy resolves as on web.
- FWA **login** (username/password → Bearer token in Capacitor Preferences).
- **Offline-first data layer**: IndexedDB (Dexie) `mothers` + `outbox`, a network-isolated **sync
  engine** (drains the outbox on app-open / reconnect / manual "Sync now"), and a **`client_uuid`**
  idempotency key so a retried create can't duplicate.
- **Screens**: My Mothers (search + per-record sync badges + offline banner), Add/Edit Mother
  (3-step stepper: general → address+**GPS** → health), Mother detail + **Mark delivery**, Settings.

## Run in the browser (dev)
```bash
cp .env.example .env.local   # point at your local API hosts
npm install
npm run dev                  # http://localhost:5175
```
Needs the API up (`../scripts/dev.sh`). Browser dev is cross-origin → the Laravel CORS config must
allow the dev origin. (On-device there is no CORS.)

## Build the Android APK
```bash
npm run build
npx cap add android          # first time only
npx cap sync android
npx cap open android         # opens Android Studio → Build > Generate Signed Bundle/APK
```
Requires Android Studio + SDK. For the pilot, distribute the signed APK directly (per the plan).

## Not yet (later phases)
Photo capture, true background sync (app closed), SQLCipher-encrypted storage, birth-reg handoff,
and the Flutter port. There are no automated tests in this package yet — `vite.config.ts` has the
vitest block wired, but nothing uses it.
