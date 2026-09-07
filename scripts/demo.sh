#!/usr/bin/env bash
#
# Suraha — put the site live on https://suraha.net from THIS laptop, with no server.
#
#   ./scripts/demo.sh
#
# It runs the production web build behind a local Caddy on :8080 (no sudo) with Laravel on
# :8000, then exposes both on the real domain through a Cloudflare Tunnel — so every upazila
# subdomain works and Cloudflare issues the TLS.
#
# One-time setup first (see DEMO.md):
#   cloudflared tunnel login
#   cloudflared tunnel create suraha-demo
#   cloudflared tunnel route dns suraha-demo suraha.net
#   cloudflared tunnel route dns suraha-demo '*.suraha.net'
#
# Ctrl+C stops everything. The demo is live only while this is running and the laptop is awake.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TUNNEL="${TUNNEL:-suraha-demo}"
LOGDIR="$ROOT/.dev-logs"
mkdir -p "$LOGDIR"

say() { printf '\033[1;35m▶\033[0m %s\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }

command -v cloudflared >/dev/null || { echo "cloudflared missing — brew install cloudflared"; exit 1; }
cloudflared tunnel info "$TUNNEL" >/dev/null 2>&1 || {
  echo "✗ No tunnel named '$TUNNEL'. Run the one-time setup in DEMO.md first."; exit 1; }

say "Suraha public demo"

# --- 0. /etc/hosts must NOT hijack the domain -------------------------------------------------
# scripts/dev.sh points every Suraha host at 127.0.0.1 so the local stack is reachable by name.
# That is exactly wrong here: the demo is public, and those lines make THIS laptop skip Cloudflare
# and the tunnel — so you would be reviewing a local copy while the audience sees something else.
if grep -Eq '^[[:space:]]*127\.0\.0\.1[[:space:]]+.*suraha\.net' /etc/hosts; then
  echo
  echo "  ✗ /etc/hosts still points suraha.net at 127.0.0.1 — this laptop will not reach the tunnel."
  echo
  echo "    Comment those lines out:"
  echo "      sudo sed -i '' -E 's/^(127\\.0\\.0\\.1[[:space:]]+.*suraha\\.net)\$/# \\1/' /etc/hosts"
  echo "      sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder"
  echo
  echo "    Restore them later with:"
  echo "      sudo sed -i '' -E 's/^# (127\\.0\\.0\\.1[[:space:]]+.*suraha\\.net)\$/\\1/' /etc/hosts"
  echo
  exit 1
fi
ok "/etc/hosts is clear — suraha.net resolves publicly"

# --- 1. the SPA, built for production ---------------------------------------------------------
if [ ! -f "$ROOT/web/dist/index.html" ]; then
  say "Building the web app"
  ( cd "$ROOT/web" && npm run build )
fi
export SURAHA_WEB_DIST="$ROOT/web/dist"
ok "serving $SURAHA_WEB_DIST"

# --- 2. migrations, so a fresh clone demos too ------------------------------------------------
( cd "$ROOT/api" && php artisan migrate --force --no-interaction >/dev/null )
ok "migrations applied"

pids=()
cleanup() {
  echo; say "Stopping…"
  for pid in "${pids[@]:-}"; do pkill -P "$pid" 2>/dev/null || true; kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  ok "stopped"
}
trap cleanup EXIT INT TERM

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# --- 3. Laravel + Caddy -----------------------------------------------------------------------
if port_busy 8000; then ok "API already on :8000"; else
  say "API on :8000  (→ $LOGDIR/api.log)"
  ( cd "$ROOT/api" && exec php artisan serve --host=127.0.0.1 --port=8000 ) >"$LOGDIR/api.log" 2>&1 &
  pids+=($!)
fi

say "Caddy on :8080  (→ $LOGDIR/caddy.log)"
caddy run --config "$ROOT/infra/Caddyfile.demo" --adapter caddyfile >"$LOGDIR/caddy.log" 2>&1 &
pids+=($!)

for p in 8000 8080; do
  n=0; until port_busy "$p"; do ((n++)); (( n > 60 )) && { echo "  ✗ :$p never came up — see $LOGDIR"; exit 1; }; sleep 0.5; done
done
ok "upstreams ready"

# --- 4. the tunnel (foreground) ---------------------------------------------------------------
echo
echo "    Live →  https://suraha.net              landing page · /app = SEAL console"
echo "            https://galachipa.suraha.net    an upazila's citizen site + officer app"
echo "            https://dumuria.suraha.net"
echo "            https://patuakhali.suraha.net   the DC's district dashboard"
echo
echo "    Logins (password 'password'): admin · uno_galachipa · fwa_galachipa · dc_patuakhali"
echo "    Ctrl+C stops the demo and takes the site offline."
echo
say "Cloudflare Tunnel '$TUNNEL'"
exec cloudflared tunnel --url http://127.0.0.1:8080 run "$TUNNEL"
