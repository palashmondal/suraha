# Deploying Suraha on AWS EC2

For an AWS account on the **credit-based Free plan** ($100 credits, 182 days). Uses EC2, not
Lightsail — Lightsail requires upgrading to the Paid plan, and on the Free plan AWS limits the
account when credits run out instead of charging your card. That safety is worth more than
Lightsail's simpler UI.

Roughly 40 minutes, most of it waiting on `docker compose build`.

---

## 0. The budget, before you click anything

Mumbai (`ap-south-1`) is the closest region to Bangladesh. Monthly estimates there:

| Item | t3.micro (1 GB) | t3.small (2 GB) |
|---|---|---|
| Instance | ~$9.50 | ~$19.00 |
| 30 GB gp3 disk | ~$2.80 | ~$2.80 |
| Public IPv4 | ~$3.60 | ~$3.60 |
| **Total** | **~$16/mo** | **~$25/mo** |
| $100 lasts | **~6 months** | ~4 months |

**Take t3.micro.** It is the only one that covers your full 182 days. Suraha at rest needs far less
than 1 GB — Postgres ~150 MB, PHP ~100 MB, two Caddys ~40 MB. Only the Vite build is memory-hungry,
and step 3 gives it swap.

If it ever feels slow, resizing is two minutes: **stop → change instance type → start**. Nothing is
lost; the disk and IP stay.

> **Everyone forgets the IPv4 charge.** Since 2024 AWS bills every public IPv4 address, ~$3.60/mo,
> whether the instance is running or stopped. Stopping the instance does *not* stop that charge —
> only releasing the address does.

**Earn the second $100.** The Free plan gives another $100 for five onboarding tasks. One is
"launch and terminate an EC2 instance", which you are about to do anyway, and another is "set up a
cost budget" — do that one in step 8.

---

## 1. Launch the instance

**EC2 → Launch instance**, with the region switcher set to **Asia Pacific (Mumbai) ap-south-1**.

| Field | Value |
|---|---|
| Name | `suraha` |
| AMI | **Ubuntu Server 24.04 LTS**, 64-bit (x86) |
| Instance type | **t3.micro** |
| Key pair | Create new → `suraha-key` → download `suraha-key.pem` |
| Storage | **30 GiB gp3** |

Under **Network settings → Edit**, allow three rules:

| Type | Source | Why |
|---|---|---|
| SSH (22) | **My IP** | Never `0.0.0.0/0` — that invites constant brute-force traffic |
| HTTP (80) | Anywhere | Let's Encrypt validates certificates over port 80 |
| HTTPS (443) | Anywhere | The site |

Then **Advanced details → Credit specification → Standard**. The default (`Unlimited`) silently
bills for CPU bursts beyond the baseline, which is exactly the surprise you do not want on a fixed
credit budget.

Launch.

---

## 2. Give it a fixed address

**EC2 → Elastic IPs → Allocate Elastic IP address → Allocate**, then **Actions → Associate** it
with the `suraha` instance.

Without this the public IP changes on every stop/start, and your DNS breaks silently.

> An Elastic IP that is *not* attached to a running instance is billed at a higher rate. When you
> eventually tear this down, **release the address**, don't just terminate the instance.

Note the address — every step below calls it `<EIP>`.

---

## 3. Connect and add swap

```bash
chmod 400 ~/Downloads/suraha-key.pem
ssh -i ~/Downloads/suraha-key.pem ubuntu@<EIP>
```

Swap first. On 1 GB of RAM the Vite build (1,750 modules) will be killed by the OOM reaper without
it:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h        # should show 4.0Gi of swap
```

---

## 4. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
```

---

## 5. Deploy

```bash
git clone https://github.com/palashmondal/suraha.git
cd suraha/infra
cp .env.example .env

docker compose build            # 10–20 minutes on t3.micro — this is the slow part
docker compose run --rm app php artisan key:generate --show
nano .env                       # paste APP_KEY, set DB_PASSWORD
docker compose up -d

docker compose exec app php artisan migrate --force
docker compose exec app php artisan storage:link
```

Four containers: **app** (Laravel on FrankenPHP), **web** (the built React app), **postgres**, and
**Caddy** on 80/443. No Redis, queue worker or scheduler — nothing in Suraha queues or schedules.

### Reference data and one admin

```bash
for s in DivisionSeeder DistrictSeeder UpazilaRefSeeder UnionRefSeeder; do
  docker compose exec app php artisan db:seed --force --class=$s
done
```

That is all a real deployment wants. `db:seed` bare runs the **demo** seed instead — see below.

### Demo data (pilot/showcase servers only)

To put the full demo on the server — Galachipa and Dumuria, the officers, and sample প্রসূতি,
জন্ম নিবন্ধন, অভিযোগ and সাক্ষাৎকার records:

```bash
docker compose exec -T -e DEMO_PASSWORD='pick-a-strong-one' app php artisan db:seed --force
```

`DEMO_PASSWORD` is not optional on a public host: without it every seeded officer — including
`admin`, which is the SEAL console — has the password `password`. The seed is re-runnable
(officers and upazilas are keyed on username/id), but the sample records are not: run it twice
and you get two sets of demo প্রসূতি and অভিযোগ rows.

Do not run this on a server holding real citizen data. There is no unseed.

```bash
docker compose exec app php artisan tinker --execute="
  App\Models\User::create([
    'name' => 'সুরাহা অ্যাডমিন',
    'username' => 'admin',
    'password' => Illuminate\Support\Facades\Hash::make('YOUR-STRONG-PASSWORD'),
    'role' => App\Enums\Role::SEAL_ADMIN->value,
    'is_active' => true,
  ]);"
```

---

## 6. Point the domain at it

In **Cloudflare → suraha.net → DNS**, first remove what is there from earlier attempts:

- the `*` **CNAME** pointing at the demo tunnel (`*.cfargotunnel.com`)
- the apex **A** records pointing at Hostinger

Then add two records, both **DNS only (grey cloud)**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `<EIP>` | **DNS only** |
| A | `*` | `<EIP>` | **DNS only** |

> **Grey cloud is not optional here.** Caddy issues a certificate per hostname over HTTP-01, and
> Cloudflare's proxy intercepts that challenge. Unproxied, Caddy handles TLS itself and every new
> upazila subdomain gets its certificate on first visit — no wildcard certificate to buy, which is
> the whole reason the wildcard works.

Verify before testing the site:

```bash
dig +short suraha.net              # → <EIP>
dig +short anything.suraha.net     # → <EIP>
```

---

## 7. Verify

| URL | Expect |
|---|---|
| `https://suraha.net/up` | a plain "healthy" page |
| `https://suraha.net` | the landing page |
| `https://suraha.net/app` | login — sign in as `admin` |
| `https://galachipa.suraha.net` | live seconds after you provision it in the console |

Watch the first certificate being issued with `docker compose logs -f proxy`.

---

## 8. Cost guardrails

**Billing → Budgets → Create budget** → Zero spend budget, or a cost budget at **$10/month** with
an email alert. This is also one of the five tasks that earns the extra $100 of credits.

Check **Billing → Free tier / Credits** weekly for the remaining balance and days.

To pause spending entirely: stop the instance *and* release the Elastic IP. Remember that releasing
the address means the next one is different — you would repoint DNS in step 6 again.

---

## 9. Retire the demo tunnel

Once the server is live, the laptop tunnel is redundant:

```bash
cloudflared tunnel delete suraha-demo
```

---

## 10. Updating

```bash
cd ~/suraha && ./scripts/deploy.sh
```

It pulls, rebuilds, restarts, migrates and recaches config/routes, and refuses to start if the
checkout is dirty or `infra/.env` is missing. `--no-pull` deploys what is already checked out.

Uploads live in the `uploads` volume, the database in `pgdata`, issued certificates in `caddydata`.
A rebuild touches none of them.

---

## When the credits run out

At ~$16/month the $100 covers about six months, and the second $100 covers the rest of the year.
After that, compare honestly: a Hostinger KVM 1 gives **4 GB for ~$12/month** against t3.micro's
1 GB for ~$16. Migrating is this same runbook on a different box plus two DNS records — the
deployment is containerised precisely so that stays cheap.
