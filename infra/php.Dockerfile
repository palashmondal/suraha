# Laravel API image. FrankenPHP = one process, no php-fpm + nginx + supervisor stack.
# Listens on :8080 (SERVER_NAME), which is what infra/Caddyfile reverse-proxies to.
FROM dunglas/frankenphp:php8.4

# pdo_pgsql: the only DB. intl: Bangla collation/normalisation. zip: composer. opcache: speed.
# No gd — QR codes and barcodes are rendered as SVG (app/Support/CertificateAssets.php).
RUN install-php-extensions pdo_pgsql intl zip opcache

WORKDIR /app
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Deps first so a code change does not re-resolve the whole tree.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
# api/.dockerignore strips the contents of these dirs, and that includes the .gitignore files
# holding them open — so COPY leaves them out of the image entirely and Laravel dies on the
# first log write. Recreate them here; the framework never makes them itself.
RUN mkdir -p storage/logs storage/app/public storage/app/private bootstrap/cache \
      storage/framework/cache/data storage/framework/sessions storage/framework/views \
 && composer dump-autoload --optimize --no-dev --classmap-authoritative \
 && chown -R www-data:www-data storage bootstrap/cache

ENV SERVER_NAME=:8080
