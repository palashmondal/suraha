#!/usr/bin/env bash
#
# Suraha — pull, rebuild, restart, migrate. Run on the server.
#
#   ./scripts/deploy.sh            pull and deploy
#   ./scripts/deploy.sh --no-pull  deploy what is already checked out
#
# The runbook in docs/DEPLOY_AWS.md §10, minus the chances to fat-finger it. Uploads
# (`uploads`), the database (`pgdata`) and issued certificates (`caddydata`) are volumes —
# nothing here touches them.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/infra"

[ -f .env ] || { echo "infra/.env missing — cp infra/.env.example infra/.env and fill it in" >&2; exit 1; }

if [ "${1:-}" != "--no-pull" ]; then
  # A dirty tree means someone hand-edited the server. Pull would abort halfway through;
  # stop before anything is rebuilt so they can look at it.
  git -C "$ROOT" diff --quiet || { echo "uncommitted changes on the server — resolve them first:" >&2; git -C "$ROOT" status --short >&2; exit 1; }
  git -C "$ROOT" pull --ff-only
fi

docker compose build
docker compose up -d
# depends_on only waits for the container to start, not for Postgres to accept connections —
# on a t3.micro that gap is seconds and the migrate below would fail into it.
for _ in $(seq 30); do
  docker compose exec -T postgres pg_isready -q && break
  sleep 2
done

# --force: migrate prompts for confirmation in production and there is no tty here.
docker compose exec -T app php artisan migrate --force

# config:cache reads the live env, so it is a runtime step, not a build one. Clearing first
# matters: a cached config from the previous release survives in the image layer otherwise.
docker compose exec -T app php artisan config:cache
docker compose exec -T app php artisan route:cache

echo "deployed: $(git -C "$ROOT" rev-parse --short HEAD)"
