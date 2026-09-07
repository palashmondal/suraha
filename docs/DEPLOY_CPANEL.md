# Deploying Suraha to shared cPanel hosting

Suraha's [Docker path](README.md#deploy-docker) assumes a VPS. This is the shared-hosting route:
build everything on your laptop, upload two folders, run four commands.

> **Read §0 first.** Suraha has four requirements that ordinary shared hosting often fails. Finding
> that out after uploading 13 MB is worse than finding it out now.

---

## 0. Check the hosting can actually run it

Log into cPanel and confirm all four. If any is missing, see [§9 If your host can't](#9-if-your-host-cant)
before doing anything else.

| # | Need | Where to check in cPanel | Why it is non-negotiable |
|---|---|---|---|
| 1 | **PHP 8.3 or newer** | *Software → MultiPHP Manager* | Laravel 13 requires it. |
| 2 | **PostgreSQL** | *Databases → PostgreSQL Databases* | The code uses `ilike` and `count(*) filter (where …)`. MySQL rejects both. |
| 3 | **Wildcard subdomain** | *Domains → Create a domain* — try `*.suraha.net` | Every upazila is a subdomain. Without it only `suraha.net` works. |
| 4 | **Shell or cron** | *Advanced → Terminal*, or *Advanced → Cron Jobs* | Migrations and the first admin account need `php artisan`. Cron is a fine substitute — see §6. |

Also confirm these PHP extensions are ticked in *Software → Select PHP Version → Extensions*:

```
pdo_pgsql  pgsql  mbstring  intl  openssl  fileinfo  curl  zip  dom  xml
```

`intl` and `pdo_pgsql` are the two that shared hosts most often leave off. Ask support to enable them.

**Nothing else is needed.** Suraha has no queue jobs, no scheduled tasks and no Redis (verified —
`app/Jobs/` is empty and `routes/console.php` registers no schedule), so there is no long-running
worker for shared hosting to choke on.

---

## 1. DNS + TLS: put Cloudflare in front

This is the one part you cannot do in cPanel alone. cPanel's free AutoSSL **cannot issue a wildcard
certificate**, so `galachipa.suraha.net` would have no HTTPS. Cloudflare's free plan solves it.

1. Add `suraha.net` to a free Cloudflare account and change the nameservers at your registrar to the
   two Cloudflare gives you.
2. In **DNS**, add two records pointing at your hosting's IP (cPanel shows it under *General
   Information → Shared IP Address*):

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | `suraha.net` | `<your-server-ip>` | Proxied (orange) |
   | A | `*` | `<your-server-ip>` | Proxied (orange) |

3. In **SSL/TLS → Overview**, set the mode to **Full (strict)**.
4. In **SSL/TLS → Origin Server**, click *Create Certificate*, accept the default hostnames
   (`suraha.net`, `*.suraha.net`), and copy the certificate and private key.
5. Back in cPanel → *Security → SSL/TLS → Manage SSL sites*, pick `suraha.net`, paste the
   certificate into **Certificate** and the key into **Private Key**, and install.

Cloudflare's Universal SSL covers `suraha.net` and one level of subdomain — exactly what Suraha
needs. Confirm on the SSL/TLS → Edge Certificates page that the certificate lists `*.suraha.net`.

> Use **Full (strict)**, not *Flexible*. Flexible makes Cloudflare talk to your host over plain HTTP,
> which makes Laravel generate `http://` links on an `https://` page and breaks logins in ways that
> are miserable to debug.

---

## 2. Create the wildcard subdomain

*Domains → Create a domain* (or *Subdomains* on older cPanel):

- Domain: `*.suraha.net`
- Document root: `public_html` — **the same root as the main domain**, not a new folder.

That single document root serving every host is the whole design: Suraha reads the `Host` header to
decide which upazila you are looking at, so `suraha.net`, `galachipa.suraha.net` and
`patuakhali.suraha.net` are the same files behaving differently. Provisioning a new upazila in the
admin console then needs **no server change at all**.

Make sure the main domain `suraha.net` also has document root `public_html` (it does by default).

---

## 3. Create the database

*Databases → PostgreSQL Databases*:

1. Create database `suraha` → cPanel names it `cpuser_suraha`.
2. Create user `suraha` with a strong password → cPanel names it `cpuser_suraha`.
3. Add the user to the database with **ALL PRIVILEGES**.

Write down the prefixed names — those are what go in `.env`, not the short ones you typed.

---

## 4. Build the upload bundle (on your laptop)

```bash
cd ~/Documents/suraha
./scripts/build-cpanel.sh
```

It runs `npm run build` and `composer install --no-dev` locally — shared hosts have no Node and an
old Composer, so nothing heavy runs there — and leaves you:

```
dist-cpanel/
├── suraha/            → goes in the HOME directory, above public_html
│   ├── .env           → your credentials (§5)
│   └── api/           → Laravel + vendor/, without public/
├── public_html/       → goes in the document root
│   ├── index.php      → front controller, points at ../suraha/api
│   ├── .htaccess      → /api → Laravel, everything else → the SPA
│   └── …              → the built React app
└── suraha-upload.zip  → both of the above, ~13 MB
```

The app code sits **outside** `public_html` on purpose: `.env`, `vendor/` and every controller stay
unreachable from the web no matter how the rewrite rules behave.

---

## 5. Upload and extract

*Files → File Manager*, go to the **home directory** (`/home/cpuser`, one level above
`public_html`), *Upload* `suraha-upload.zip`, then right-click it → **Extract** there.

That drops `suraha/` next to `public_html/` and merges the SPA into `public_html/`. Delete the zip
afterwards.

Then edit `suraha/.env` (right-click → Edit) and fill in the block at the bottom:

```ini
APP_KEY=base64:…            # §6 generates this
APP_URL=https://suraha.net
ASSET_URL=https://suraha.net

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=cpuser_suraha
DB_USERNAME=cpuser_suraha
DB_PASSWORD=…
```

Leave `SMS_GATEWAY=log` and `BDRIS_DRIVER=mock` until those integrations are live — `alpha` sends
real SMS and costs real money.

One env file covers both halves of the install: `api/bootstrap/app.php` loads `../.env` before
Laravel reads its own, and both loaders are immutable, so there is no `api/.env` on the server at
all.

---

## 6. Run the four commands

*Advanced → Terminal*:

```bash
cd ~/suraha/api

php artisan key:generate --show     # paste the output into ~/suraha/.env as APP_KEY
php artisan migrate --force
ln -s ~/suraha/api/storage/app/public ~/public_html/storage

for s in DivisionSeeder DistrictSeeder UpazilaRefSeeder UnionRefSeeder; do
  php artisan db:seed --force --class=$s
done
```

Those four seeders load the বিভাগ/জেলা/উপজেলা/ইউনিয়ন catalogue (8 / 64 / 499 / 4,567 rows) from the
national portal. **Do not run `php artisan db:seed` bare** — the default `DatabaseSeeder` is the dev
seed and would create two demo upazilas and eight officer accounts whose password is `password`.

Then create the one real account:

```bash
php artisan tinker --execute="
  App\Models\User::create([
    'name' => 'সুরাহা অ্যাডমিন',
    'username' => 'admin',
    'password' => Illuminate\Support\Facades\Hash::make('YOUR-STRONG-PASSWORD'),
    'role' => App\Enums\Role::SEAL_ADMIN->value,
    'is_active' => true,
  ]);"
```

### No Terminal? Use a one-off cron job

*Advanced → Cron Jobs*, set it to run every minute, command:

```
cd /home/cpuser/suraha/api && /usr/local/bin/php artisan migrate --force >> ~/deploy.log 2>&1
```

Wait a minute, check `~/deploy.log` in File Manager, then **delete the cron job** and repeat for the
next command. Slow, but it needs no shell. (Ask your host for the exact PHP 8.3 binary path — it is
often `/opt/cpanel/ea-php83/root/usr/bin/php`.)

---

## 7. Verify

| Check | Expect |
|---|---|
| `https://suraha.net/up` | a plain "healthy" page — Laravel is alive |
| `https://suraha.net` | the সুরাহা landing page |
| `https://suraha.net/app` | the login screen; sign in as `admin` |
| `https://anything.suraha.net` | reaches the app (an unprovisioned upazila shows its own notice) |

From `/app`, provision your first upazila — বিভাগ → জেলা → উপজেলা. Its subdomain works immediately.

---

## 8. Updating later

```bash
./scripts/build-cpanel.sh
```

Upload the new zip, extract over the top, and re-run `php artisan migrate --force`. Nothing in
`suraha/.env`, `suraha/api/storage/app/public/` (uploads) or the database is touched — the bundle
deliberately contains no `.env` and no uploaded files.

---

## 9. If your host can't

**No PostgreSQL** — the blocker with no cheap workaround. In order of preference:

1. **Ask support to enable it.** cPanel ships PostgreSQL support; many hosts just leave it off.
2. **Use a hosted Postgres** (Neon or Supabase both have a free tier) and point `DB_HOST` at it.
   Test first that the shared host allows outbound connections on port 5432 — many block it:
   `php -r "var_dump(fsockopen('your-db-host', 5432, \$e, \$s, 5));"` in Terminal.
3. **Port the code to MySQL.** About twenty `ilike` call sites plus two `count(*) filter (where …)`
   aggregates in `PregnancyController` and `BirthRegistrationController`. Real work, and it undoes a
   deliberate decision — dev, tests and production currently all run the same engine.

**No wildcard subdomain** — Suraha's multi-tenancy is subdomain-based, so without it you are limited
to whatever subdomains you create by hand, one cPanel entry per upazila. Workable for two or three,
not for a rollout.

**Neither is available** — a small VPS (Hetzner CX22, DigitalOcean, or a local Bangladeshi provider)
runs the Docker setup in `infra/` for roughly the price of the shared plan, and every problem above
disappears. See [README → Deploy (Docker)](README.md#deploy-docker).
