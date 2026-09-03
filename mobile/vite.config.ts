/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  // 5175 so it doesn't clash with the web app (5173) / API (8000) during local dev.
  server: { port: 5175, host: true },
  test: {
    globals: true,
    environment: 'jsdom',
  }
})
