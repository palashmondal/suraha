# Live demo without a server

Put Suraha on the real `https://suraha.net` — every upazila subdomain, real TLS — served from your
laptop through a Cloudflare Tunnel. Free, no VPS, about 15 minutes.

The demo is live only while `scripts/demo.sh` is running and the laptop is awake. That is the whole
trade: it is a demo, not a deployment.

## Why this works

`suraha.net` is already on Cloudflare nameservers, so there is **no nameserver change and no
propagation wait**. The tunnel dials out from your laptop — nothing is exposed inbound, no port
forwarding, no firewall rule. Cloudflare terminates TLS for `suraha.net` and `*.suraha.net` with its
free Universal SSL, and forwards the **original `Host` header**, which is exactly what Suraha's
tenancy reads. So `galachipa.suraha.net` resolves the Galachipa tenant just as it would in
production.

`scripts/demo.sh` serves the **production web build**, not the Vite dev server — a dev server behind
a tunnel is slow and drops its websocket. Caddy sits on `:8080`, so nothing needs `sudo`.

---

## One-time setup

```bash
brew install cloudflared          # already installed if you ran this before

cloudflared tunnel login          # opens a browser — pick the suraha.net zone
cloudflared tunnel create suraha-demo
```

Then point the domain at the tunnel:

```bash
cloudflared tunnel route dns --overwrite-dns suraha-demo suraha.net
cloudflared tunnel route dns --overwrite-dns suraha-demo '*.suraha.net'
```

`--overwrite-dns` replaces the `A` record `suraha.net` already has. Without it the command fails
with `code: 1003 … a record with that host already exists`.

> **Screenshot Cloudflare → DNS first** if you ever want the old records back. `dig` will not tell
> you what they held: a proxied record resolves to Cloudflare's own addresses (`172.67.x`,
> `104.21.x`), so the real origin is visible only in the dashboard.

### When `--overwrite-dns` still fails with 1003

It can only replace **one** record. If the hostname has two (`suraha.net` had two `A` records), it
gives up. Delete them by hand in Cloudflare → **DNS** — every `A`/`AAAA`/`CNAME` row for that
hostname — then re-run the command.

If the apex is being stubborn and the clock is running, skip it: `*.suraha.net` already covers
`www`, so put the landing page and SEAL console there instead. Add one line to `api/.env` and
restart:

```ini
DEMO_CENTRAL_HOST=www.suraha.net
```

Then demo from `https://www.suraha.net` — it is the central host, with every upazila subdomain
working as normal.

---

## Run it

```bash
caffeinate -i ./scripts/demo.sh
```

`caffeinate -i` stops the Mac sleeping mid-demo, which would take the site offline. Ctrl+C ends the
demo and the site goes down with it.

| URL | What it shows |
|---|---|
| `https://suraha.net` | The product landing page |
| `https://suraha.net/app` | The SEAL console — sign in as `admin` |
| `https://galachipa.suraha.net` | An upazila's citizen site; `/app` is its officers' app |
| `https://dumuria.suraha.net` | A second upazila, to show the switcher is real |
| `https://patuakhali.suraha.net` | The DC's district dashboard |

Officer logins, all with password `password`: `admin`, `uno_galachipa`, `fwa_galachipa`,
`tdonto_galachipa`, `sochib_galachipa`, `dc_patuakhali`, `dc_khulna`.

The seeded database already carries a demo-sized dataset — 2 upazilas, 26 unions, 11 officers, 136
প্রসূতি records, 114 অভিযোগ, and six months of activity history so the charts are not empty.

### Reset to a clean demo dataset

```bash
cd api && php artisan migrate:fresh --seed
```

---

## Before you present

- **Check it from your phone on mobile data**, not the office wifi — that proves it is really public.
- Open each of the five URLs once while the tunnel is up, so nothing is cold on stage.
- Set `APP_DEBUG=false` in `api/.env` if strangers will be clicking around; otherwise a stack trace
  is one bad URL away.
- Keep the terminal running `demo.sh` visible but not projected — it logs every request.

---

## Emergency fallback: no DNS at all

If the DNS step fights you and time is short, a **quick tunnel** needs no account, no domain and no
setup — it prints a random `https://<random>.trycloudflare.com` URL:

```bash
# terminal 1 — the local stack
cd api && php artisan serve --port=8000
# terminal 2
SURAHA_WEB_DIST=$PWD/web/dist caddy run --config infra/Caddyfile.demo --adapter caddyfile
# terminal 3
cloudflared tunnel --url http://127.0.0.1:8080
```

That URL is a single hostname, so there are no upazila subdomains. Tell Suraha to treat it as the
**central** host and the SEAL console still reaches every upazila through the in-app switcher —
add one line to `api/.env` and restart the API:

```ini
DEMO_CENTRAL_HOST=abc-def-ghi.trycloudflare.com
```

You lose the per-upazila citizen sites; you keep the landing page, the SEAL console, every
dashboard, and all the module screens. It is a weaker demo, but it is five minutes and cannot fail
on DNS.

---

## After the demo

Ctrl+C. The site goes offline immediately. To restore the old DNS, re-add the `A` records you
deleted; to remove the tunnel entirely, `cloudflared tunnel delete suraha-demo`.

For a permanent deployment see [README → Deploy (Docker)](README.md#deploy-docker) — a small VPS,
where the same wildcard works without a laptop behind it.
