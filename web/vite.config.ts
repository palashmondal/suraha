import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Suraha is delivered as an installable PWA (SURAHA_BUILD_PROMPT §1.1(2)). Writes are queued in the
// IndexedDB outbox (src/offline/) and background-synced; here the service worker precaches the app
// shell, serves it for navigations while offline (navigateFallback), and runtime-caches uploaded
// images so the installed app opens and remains usable without connectivity.
export default defineConfig({
  // Env lives at the repo root, one file shared with the API — see ../.env. Without this Vite
  // would only look inside web/, and the keys would have to be duplicated.
  envDir: path.resolve(__dirname, '..'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        // Serve the cached SPA shell for navigation requests when offline. API and uploaded-file
        // paths must never fall back to index.html — they are data, not navigations.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/storage/],
        runtimeCaching: [
          {
            // Uploaded files (report attachments, avatars, certificates) — show last-seen copy offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/storage'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'suraha-uploads',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'সুরাহা',
        short_name: 'সুরাহা',
        lang: 'bn',
        dir: 'ltr',
        theme_color: '#6750A4',
        background_color: '#F7F2FA',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    host: true,
    // Allow the per-upazila subdomains used for tenancy (dev: {upazila}.lvh.me,
    // prod: {upazila}.suraha.net). A leading dot whitelists all subdomains.
    allowedHosts: ['.lvh.me', '.suraha.net'],
    // Same-origin API: with VITE_API_BASE=/api the SPA calls /api/* on its own host. When you
    // hit Vite directly (:5173) this proxy forwards to Laravel; behind the port-80 Caddy proxy
    // (infra/Caddyfile.dev) Caddy routes /api itself. changeOrigin:false keeps the Host header
    // so subdomain tenancy still resolves.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      // Uploaded files (report attachments, avatars) live on Laravel's public disk.
      '/storage': { target: 'http://127.0.0.1:8000', changeOrigin: false },
    },
    // HMR websocket port. Behind the Caddy dev proxy the browser is on :443, so the socket must
    // dial 443 (wss) and let Caddy upgrade it to Vite — scripts/dev.sh sets CADDY=1 for that.
    // Hitting Vite directly (http://{upazila}.suraha.net:5173) uses Vite's default, the page's
    // own port, so live-reload works there too.
    hmr: process.env.CADDY ? { clientPort: 443 } : undefined,
  },
});
