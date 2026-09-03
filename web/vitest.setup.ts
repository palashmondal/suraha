// Polyfills a real IndexedDB onto globalThis for the test run, so the offline outbox is tested
// against an actual store rather than a mock.
import 'fake-indexeddb/auto';
