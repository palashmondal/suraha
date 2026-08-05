import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// FWA field client is delivered as an installable PWA (SURAHA_BUILD_PROMPT §1.1(2)).
// The offline queue + Background Sync land with the pregnancy module (Milestone 4);
// here we register the manifest + app-shell precache so the install path exists early.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
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
    // prod: {upazila}.suraha.com.bd). A leading dot whitelists all subdomains.
    allowedHosts: ['.lvh.me', '.suraha.com.bd', '.suraha.gov.bd'],
  },
});
