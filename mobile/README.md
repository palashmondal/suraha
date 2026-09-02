# Suraha FWA — mobile app

Offline-first Android app (Ionic React + Capacitor) for the FWA (পরিবার কল্যাণ সহকারী) to register
প্রসূতি (expecting mother) records in the field and sync them to the Suraha backend. See the full
design in [`../FWA_MOBILE_APP_PLAN.md`](../FWA_MOBILE_APP_PLAN.md).

## What's built (Phases 0–3 + delivery)
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
and the Flutter port.
