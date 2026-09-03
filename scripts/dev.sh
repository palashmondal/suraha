#!/usr/bin/env bash
#
# Suraha — start the whole local site with one command.
#
#   ./scripts/dev.sh
#
# It:
#   1. ensures suraha.net + every upazila and district subdomain resolve to 127.0.0.1
#      (adds any missing /etc/hosts entries — needs sudo),
#   2. applies pending DB migrations (safe/idempotent) — needs Postgres running:
#      `brew services start postgresql@17`,
#   3. starts the Laravel API (:8000) and the Vite web app (:5173) in the background,
#   4. starts the Caddy reverse proxy on :80/:443 (trusted HTTPS via Caddy's internal CA).
#
# Then open  https://suraha.net  (Ctrl+C stops everything).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="$ROOT/api"
WEB="$ROOT/web"
LOGDIR="$ROOT/.dev-logs"
BASE_DOMAIN="suraha.net"
mkdir -p "$LOGDIR"

say() { printf '\033[1;35m▶\033[0m %s\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }

say "Suraha local dev"

# --- 1. DNS: /etc/hosts must map the central host + each upazila subdomain to 127.0.0.1 -------
hosts_needed=("$BASE_DOMAIN")
# Every Suraha host: one per provisioned upazila (UNO dashboards) plus one per district that has
# at least one upazila (the DC dashboards). Hosts files have no wildcards, so each needs its own
# line — which is why this list is rebuilt on every run. Asked of the app rather than the database
# directly, so it keeps working now that the DB is Postgres.
while IFS= read -r d; do
  [[ -n "$d" ]] && hosts_needed+=("$d.$BASE_DOMAIN")
done < <(cd "$API" && php artisan suraha:hosts 2>/dev/null || true)

missing=()
for h in "${hosts_needed[@]}"; do
  grep -Fqw "$h" /etc/hosts || missing+=("$h")
done

if (( ${#missing[@]} )); then
  say "Adding ${#missing[@]} host(s) to /etc/hosts (sudo):"
  printf '    %s\n' "${missing[@]}"
  { for h in "${missing[@]}"; do printf '127.0.0.1\t%s\n' "$h"; done; } | sudo tee -a /etc/hosts >/dev/null
  ok "/etc/hosts updated"
else
  ok "/etc/hosts already has all ${#hosts_needed[@]} host(s)"
fi

# --- 2. DB: apply any pending migrations (does not wipe or reseed) ----------------------------
( cd "$API" && php artisan migrate --force --no-interaction >/dev/null )
ok "migrations applied"

# --- 3. background services + clean shutdown --------------------------------------------------
pids=()
cleanup() {
  echo
  say "Stopping services…"
  for pid in "${pids[@]:-}"; do
    pkill -P "$pid" 2>/dev/null || true   # children (npm→vite, artisan→php server)
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "stopped"
}
trap cleanup EXIT INT TERM

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

if port_busy 8000; then
  ok "API already running on :8000"
else
  say "Starting API on :8000  (→ $LOGDIR/api.log)"
  ( cd "$API" && exec php artisan serve --host=127.0.0.1 --port=8000 ) >"$LOGDIR/api.log" 2>&1 &
  pids+=($!)
fi

if port_busy 5173; then
  ok "Web already running on :5173"
else
  say "Starting web on :5173  (→ $LOGDIR/web.log)"
  ( cd "$WEB" && CADDY=1 exec npm run dev ) >"$LOGDIR/web.log" 2>&1 &
  pids+=($!)
fi

# --- 4. wait for the upstreams before fronting them ------------------------------------------
wait_port() {
  local p=$1 n=0
  until port_busy "$p"; do
    ((n++)); (( n > 60 )) && { echo "  ✗ :$p did not come up — see $LOGDIR"; exit 1; }
    sleep 0.5
  done
}
wait_port 8000
wait_port 5173
ok "upstreams ready"

# --- 5. Caddy on 80/443 (foreground; Ctrl+C triggers the cleanup trap above) ------------------
say "Starting Caddy on :80/:443 (sudo)"
echo
echo "    Open →  https://$BASE_DOMAIN"
for h in "${hosts_needed[@]:1}"; do echo "            https://$h"; done
echo "    (Ctrl+C stops the API, web, and proxy.)"
echo
sudo caddy run --config "$ROOT/infra/Caddyfile.dev" --adapter caddyfile
