# সুরাহা — mobile app

Offline-first Android app (Ionic React + Capacitor) for the Suraha platform. **One app for every
role** — officers and citizens sign in to the same build and see only what their role allows. v1
ships the FWA (পরিবার কল্যাণ সহকারী) workflow: register প্রসূতি (expecting mother) records in the
field and sync them to the Suraha backend. See the design in
[`../FWA_MOBILE_APP_PLAN.md`](../FWA_MOBILE_APP_PLAN.md).

## Status against the plan's phases

| Phase | State |
|---|---|
| 0 — Scaffold | ✅ Ionic React + Capacitor project, theme, dev server |
| 1 — Connect & auth | ✅ Upazila directory + picker, officer login, Bearer token in the Keystore |
| 2 — Local data layer | ✅ Dexie (IndexedDB) `mothers` + `outbox`, connectivity service |
| 3 — Core workflow | ✅ My Mothers list, Add Mother 3-step stepper, GPS |
| 4 — Sync engine | ✅ Outbox drain, `client_uuid` idempotency, badges, auto + manual sync |
| 5 — Delivery & edit | ✅ Mother detail, edit, delivery confirmation (queued) |
| 6 — Harden & ship | ⚠️ `android/` committed, records encrypted, states + tests done — **on-device QA and the signed APK still need a machine with the Android SDK** |

> The plan calls for Capacitor SQLite + SQLCipher; this is built on **Dexie/IndexedDB**, which runs
> unchanged in both the browser dev build and the Android WebView. Encryption is therefore done at
> the record level instead — see *Encryption at rest* below.

## What's built
- First-run **upazila picker** (`GET /api/upazilas/directory` on the central host) → pins the API
  base to `https://{slug}.suraha.net/api`, so backend tenancy resolves as on web.
- **Login** (username/password → Bearer token, stored in the Android Keystore via
  `@aparajita/capacitor-secure-storage`).
- **Offline-first data layer**: IndexedDB (Dexie) `mothers` + `outbox`, a network-isolated **sync
  engine** (drains the outbox on app-open / reconnect / manual "Sync now"), and a **`client_uuid`**
  idempotency key so a retried create can't duplicate.
- **Screens**: My Mothers (search + per-record sync badges + offline banner), Add/Edit Mother
  (3-step stepper: general → address+**GPS** → health), Mother detail + **Mark delivery**, Settings.

## Encryption at rest
IndexedDB is plaintext in the WebView, and these are named pregnancy records. Every §8.1 field is
therefore AES-GCM encrypted into a single `enc` blob before it is written
([`src/lib/crypto.ts`](src/lib/crypto.ts), [`src/lib/db.ts`](src/lib/db.ts)); only sync bookkeeping
(`local_id`, `server_id`, `sync_status`, timestamps) stays readable, because the sync engine indexes
it. The 256-bit key is generated once per install and lives in the **Android Keystore**, never in
the database it protects — so a pulled `.db` file is useless on its own, and uninstalling the app
destroys the records rather than leaving them recoverable. Cloud backup is off
(`android:allowBackup="false"`) so the records never leave the device except through the API.

WebCrypto requires a secure context: Capacitor serves `https://localhost` on-device and vite serves
`localhost` in dev, both fine. `vite --host` over a LAN IP is **not** — use the emulator for
crypto-path testing in a browser.

## Run in the browser (dev)
```bash
cp .env.example .env.local   # point at your local API hosts
npm install
npm run dev                  # http://localhost:5175
```
Needs the API up (`../scripts/dev.sh`). Browser dev is cross-origin → the Laravel CORS config must
allow the dev origin. (On-device there is no CORS.)

## Tests
```bash
npm run test.unit            # vitest
```
Covers the two places a record can be lost silently: the outbox drain in
[`src/lib/sync.ts`](src/lib/sync.ts) (4xx drops the op vs 5xx keeps it queued) and the
encrypt/decrypt round-trip in [`src/lib/crypto.ts`](src/lib/crypto.ts).

## Android build

`android/` is committed (source, not build output). Building needs **JDK 21 + the Android SDK**
(easiest via Android Studio; `minSdk 28` / Android 9+, `targetSdk 36`).

```bash
npm run android              # vite build + cap sync android
npx cap open android         # Android Studio → Run, or Build > Build APK
```

Or from the CLI, once `ANDROID_HOME` and a JDK are on the path:
```bash
cd android && ./gradlew assembleDebug     # app/build/outputs/apk/debug/
```

### Signing a release APK for the pilot
Generate a keystore once and keep it (and these passwords) out of the repo — losing it means no
future build can upgrade an installed app:
```bash
keytool -genkey -v -keystore ~/suraha-release.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias suraha
```
Then write `android/keystore.properties` (gitignored):
```properties
storeFile=/absolute/path/to/suraha-release.jks
storePassword=…
keyAlias=suraha
keyPassword=…
```
and build:
```bash
cd android && ./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk
```
Without that file the release build still runs and simply produces an unsigned APK. Side-load the
signed APK for the pilot; the Play Store track comes later.

## Still to do before the pilot
- **On-device QA**: first-run upazila pick → login → add a mother offline → airplane mode →
  reconnect → confirm **one** record, not two (the `client_uuid` path).
- **Launcher icon**: `android/app/src/main/res/drawable/ic_launcher_foreground.xml` is a placeholder
  mark on Suraha purple. Replace with the designed icon.
- **Other roles' screens** (UNO / DC / সচিব / নাগরিক). The shell, tenancy and auth are role-agnostic
  already; citizens additionally need the OTP login path, and district roles need a district host
  rather than an upazila subdomain.

## Not yet (later phases)
Photo capture, true background sync (app closed), birth-reg handoff, and the Flutter port.
