# সুরাহা — Web (React + Vite PWA)

The Suraha frontend: one installable PWA serving every role (FWA, Sochib, UNO,
investigating officer, DC, SEAL admin, and citizens). React + Vite + MUI, Bangla-only,
light/dark. See [`../SURAHA_BUILD_PROMPT.md`](../SURAHA_BUILD_PROMPT.md) for the product spec.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173 (or {upazila}.lvh.me / {upazila}.suraha.net via the dev proxy)
npm run build      # tsc -b && vite build — also generates the service worker
npm run lint       # tsc -b --noEmit
npm run test       # vitest run
```

The API base defaults to `<same-host>:8000/api` so the upazila subdomain carries through to the
API and tenancy resolves automatically; override with `VITE_API_BASE` (see `.env.example`).

## Offline support (`src/offline/`)

Suraha is offline-tolerant per SURAHA_BUILD_PROMPT §1.1(2): field/citizen submissions made without
connectivity are stored locally and sent when the connection returns.

| File | Role |
|---|---|
| `db.ts` | Dependency-free promise wrapper over IndexedDB (one `outbox` store). |
| `outbox.ts` | Outbox item type + `enqueue` / `listOutbox` / `saveItem` / `removeItem`; `newId()` mints the client UUID. |
| `useOnlineStatus.ts` | Reactive `navigator.onLine`. |
| `SyncProvider.tsx` | Context: `submit` (network-first, queue on connection loss), `queue` (offline-first, for FWA capture), flush-on-reconnect, and `retryFailed`. Rides the shared `api()` client (same token + `X-Upazila` tenant header). |

**How a submission flows**

1. A form calls `submit({ kind, endpoint, method, payload })`.
2. Online → POSTs immediately (sending `client_uuid` = the outbox UUID) and returns the server data.
   A validation/4xx error is re-thrown so the form can show it.
3. Offline / connection lost → the write is stored in the IndexedDB outbox and the form shows a
   "saved offline, will sync" card.
4. On reconnect (`online` event) the queue flushes oldest-first; a server rejection parks the item
   as `failed` (retryable via the offline banner) rather than blocking the queue.

Wired into the public submit forms (`pages/public/`: complaint, appointment, assistance, suggestion)
and FWA capture (`pages/pregnancy/PregnancyAdd.tsx`). `OfflineBanner` shows offline / pending-sync /
failed state in both the officer shell and the public layout; queued items also appear in
`pages/public/MySubmissions.tsx`.

> Idempotency: replays send `client_uuid`, and every submission endpoint dedups on it — pregnancies,
> complaints, appointments, assistances and suggestions each carry a unique `(tenant_id,
> client_uuid)` and return the existing record on a replay. So a submission whose response was lost
> cannot duplicate, whichever form produced it.

## PWA

`vite.config.ts` configures `vite-plugin-pwa` (Workbox): app-shell precache, `navigateFallback` so the
installed app opens offline (with `/api` and `/storage` denylisted), and a StaleWhileRevalidate cache
for `/storage` uploads. `src/pwa/InstallPrompt.tsx` offers add-to-home-screen.

## Tests

`vitest` with `fake-indexeddb` (see `vitest.config.ts` / `vitest.setup.ts`). Current coverage:
the offline outbox (`src/offline/outbox.test.ts`). Run with `npm run test`.
