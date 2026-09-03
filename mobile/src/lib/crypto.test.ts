import { expect, it, vi } from 'vitest';

// The plugin's web fallback reaches for a bare `localStorage`, which the node test runner shadows
// with an undefined global — stub the key store, the logic under test is this file's.
vi.mock('@aparajita/capacitor-secure-storage', () => {
  const store = new Map<string, string>();
  return {
    SecureStorage: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
    },
  };
});
import { decryptJson, encryptJson } from './crypto';
import type { MotherFields } from '../data/mother';

// If this breaks, every record on every device becomes unreadable — worth the ten lines.
it('round-trips a record and hides its contents', async () => {
  const fields: Partial<MotherFields> = { mother_name_bn: 'রোকেয়া বেগম', mobile: '01712345678', ward_no: 3 };

  const blob = await encryptJson(fields);

  expect(blob).not.toContain('রোকেয়া');
  expect(blob).not.toContain('01712345678');
  expect(await decryptJson<typeof fields>(blob)).toEqual(fields);
});

it('uses a fresh iv per call', async () => {
  expect(await encryptJson({ a: 1 })).not.toBe(await encryptJson({ a: 1 }));
});
