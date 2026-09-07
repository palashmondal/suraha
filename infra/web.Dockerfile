# React SPA: build with Vite, then serve the static bundle. Two stages so node never ships.
FROM node:22-alpine AS build
# vite.config.ts sets envDir to the parent of web/, so the app lives at /app/web and the
# VITE_* build vars are written to /app/.env.production below.
WORKDIR /app/web
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# VITE_API_BASE=/api keeps the SPA same-origin, so the upazila subdomain in the URL is the
# host the API sees and tenancy resolves. Without it the bundle falls back to :8000.
ARG VITE_API_BASE=/api
ARG VITE_GOOGLE_MAPS_KEY=
RUN printf 'VITE_API_BASE=%s\nVITE_GOOGLE_MAPS_KEY=%s\n' \
      "$VITE_API_BASE" "$VITE_GOOGLE_MAPS_KEY" > /app/.env.production \
 && npm run build

FROM caddy:2-alpine
COPY --from=build /app/web/dist /srv
# SPA fallback: every unknown path is a client route, not a 404.
RUN printf ':80\nroot * /srv\ntry_files {path} /index.html\nfile_server\n' > /etc/caddy/Caddyfile
