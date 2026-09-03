import { defineConfig } from 'vitest/config';

// Unit tests for framework-free logic (the offline outbox). fake-indexeddb (loaded in setup) provides
// a real IndexedDB implementation in Node so db.ts/outbox.ts are exercised for real, not mocked.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
