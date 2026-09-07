#!/usr/bin/env bash
#
# Suraha — build the exact two folders that get uploaded to cPanel.
#
#   ./scripts/build-cpanel.sh
#
# Produces dist-cpanel/ containing:
#
#   suraha/       → upload to the home dir, ABOVE public_html (never web-reachable)
#     .env        → your credentials; copied from the repo root .env if present
#     api/        → Laravel app + vendor/, without public/
#   public_html/  → the document root: the built SPA + Laravel's front controller
#
# and dist-cpanel/suraha-upload.zip with both, ready for cPanel's File Manager.
#
# Everything heavy (npm, composer) runs here, not on the shared host — which is the point:
# shared hosting usually has no Node and an old Composer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist-cpanel"

say() { printf '\033[1;35m▶\033[0m %s\n' "$*"; }

rm -rf "$OUT"
mkdir -p "$OUT/suraha" "$OUT/public_html"

# --- 1. The SPA ------------------------------------------------------------------------------
# VITE_API_BASE must be /api so the bundle calls the API on whatever host it was loaded from —
# that host is the upazila, and it is how tenancy resolves.
say "Building the web app"
( cd "$ROOT/web" && VITE_API_BASE=/api npm run build )
cp -R "$ROOT/web/dist/." "$OUT/public_html/"
find "$OUT/public_html" -name '.DS_Store' -delete

# --- 2. Laravel, minus public/ and minus everything that is local-only ------------------------
say "Copying the API"
rsync -a \
  --exclude 'vendor/' --exclude '.env' --exclude 'tests/' --exclude '.phpunit.result.cache' \
  --exclude '.DS_Store' \
  --exclude 'public/' \
  --exclude 'storage/app/public/*' --exclude 'storage/app/private/*' \
  --exclude 'storage/logs/*' --exclude 'storage/framework/cache/data/*' \
  --exclude 'storage/framework/sessions/*' --exclude 'storage/framework/views/*' \
  --exclude 'bootstrap/cache/*.php' \
  "$ROOT/api/" "$OUT/suraha/api/"

say "Installing production dependencies (no dev)"
( cd "$OUT/suraha/api" && composer install --no-dev --optimize-autoloader --no-interaction --quiet )

# One env file for the whole install. bootstrap/app.php loads it from the parent of api/ and
# Laravel's own loader cannot override it (both are immutable), so api/.env is not needed at all
# on the server — APP_KEY and DB_* live here too.
say "Assembling suraha/.env"
cp "${ROOT}/.env" "$OUT/suraha/.env" 2>/dev/null || cp "$ROOT/.env.example" "$OUT/suraha/.env"
cat >> "$OUT/suraha/.env" <<'ENVBLOCK'

# ==========================================================================
#  Production (cPanel). FILL THESE IN before the site will boot.
# ==========================================================================
APP_NAME=সুরাহা
APP_ENV=production
APP_DEBUG=false
# php artisan key:generate --show   (run it in cPanel Terminal, or locally, and paste here)
APP_KEY=
APP_URL=https://suraha.net
ASSET_URL=https://suraha.net
APP_LOCALE=bn
APP_FALLBACK_LOCALE=en
LOG_CHANNEL=stack
LOG_LEVEL=warning

# PostgreSQL, from cPanel → PostgreSQL Databases. The username is prefixed with your
# cPanel account name (e.g. cpuser_suraha).
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
DB_PERSISTENT=false

# Nothing in Suraha queues or schedules, so the database drivers are all that is needed —
# no Redis, no cron worker.
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
ENVBLOCK

# --- 3. The document root --------------------------------------------------------------------
# Laravel's front controller, pointed at ~/suraha/api instead of a sibling public/.
say "Writing public_html/index.php and .htaccess"
cat > "$OUT/public_html/index.php" <<'PHP'
<?php

// Suraha front controller for cPanel. The Laravel app lives OUTSIDE the document root, in
// ~/suraha/api — only this file and the built SPA are web-reachable.
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$app_path = __DIR__.'/../suraha/api';

if (file_exists($maintenance = $app_path.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $app_path.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $app_path.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
PHP

cat > "$OUT/public_html/.htaccess" <<'HTACCESS'
# Suraha on Apache/cPanel. One document root serves both halves of the site:
#   /api/*  and /up   → Laravel (index.php)
#   everything else   → the React SPA (index.html), which owns client-side routing
# The split is by path, not host, so suraha.net and every {upazila}.suraha.net behave the same.
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Bearer tokens: without this, Apache in CGI/FastCGI mode drops the Authorization header
    # and every authenticated API call comes back 401.
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Real files win: the SPA's assets, and uploaded files through the storage symlink.
    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]

    # The API and the health check are Laravel's.
    RewriteRule ^(api|up)(/|$) index.php [L]

    # Anything else is a React route — hand it the app shell.
    RewriteRule ^ index.html [L]
</IfModule>

# The service worker must never be cached, or an update never reaches an installed PWA.
<FilesMatch "^(sw\.js|registerSW\.js|index\.html)$">
    Header set Cache-Control "no-cache, must-revalidate"
</FilesMatch>
HTACCESS

# --- 4. Zip it -------------------------------------------------------------------------------
say "Zipping"
( cd "$OUT" && zip -qry suraha-upload.zip suraha public_html )

printf '\n  \033[32m✓\033[0m %s\n' "$OUT/suraha-upload.zip"
du -sh "$OUT/suraha" "$OUT/public_html" "$OUT/suraha-upload.zip" | sed 's/^/    /'
echo
echo "    Next: DEPLOY_CPANEL.md"
