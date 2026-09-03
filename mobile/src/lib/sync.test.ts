import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api';

// The outbox drain is the one place a mother's record can be lost silently: a 4xx must drop the op
// and surface an error, a 5xx must keep it queued for the next sync. Everything else here is a
// stub — Dexie needs a real IndexedDB, and the branch under test is pure control flow in sync.ts.

const fakeDb = {
  outbox: {
    rows: [] as Array<{ id: number; local_id: string; op: string; payload: unknown; attempts: number; last_error?: string }>,
    orderBy: () => ({ toArray: async () => [...fakeDb.outbox.rows] }),
    delete: async (id: number) => {
      fakeDb.outbox.rows = fakeDb.outbox.rows.filter((r) => r.id !== id);
    },
    update: async (id: number, patch: Record<string, unknown>) => {
      Object.assign(fakeDb.outbox.rows.find((r) => r.id === id)!, patch);
    },
  },
  mothers: {
    rows: {} as Record<string, Record<string, unknown>>,
    get: async (id: string) => fakeDb.mothers.rows[id],
    update: async (id: string, patch: Record<string, unknown>) => {
      Object.assign(fakeDb.mothers.rows[id], patch);
    },
  },
};

const apiMock = vi.fn();

vi.mock('./db', () => ({ db: () => fakeDb, fromStored: async (r: unknown) => r }));
vi.mock('./net', () => ({ isOnline: async () => true }));
vi.mock('./tenant', () => ({ getSelectedUpazila: async () => ({ slug: 'demo', name_bn: 'ডেমো' }) }));
vi.mock('./api', async (orig) => ({ ...(await orig<object>()), api: (...a: unknown[]) => apiMock(...a) }));

const { syncNow } = await import('./sync');

function seed(count: number) {
  // mockClear, not mockReset — resetting the implementation leaves the previous rejected value
  // dangling as an unhandled rejection.
  apiMock.mockClear();
  fakeDb.outbox.rows = [];
  fakeDb.mothers.rows = {};
  for (let i = 1; i <= count; i++) {
    const local_id = `m${i}`;
    fakeDb.mothers.rows[local_id] = { local_id, mother_name_bn: 'রোকেয়া', sync_status: 'pending' };
    fakeDb.outbox.rows.push({ id: i, local_id, op: 'create', payload: {}, attempts: 0 });
  }
}

describe('syncNow outbox drain', () => {
  it('drops the op and flags the record on a 4xx', async () => {
    seed(1);
    apiMock.mockRejectedValue(new ApiError(422, 'মায়ের নাম আবশ্যক।'));

    await syncNow();

    expect(fakeDb.outbox.rows).toHaveLength(0);
    expect(fakeDb.mothers.rows.m1.sync_status).toBe('error');
    expect(fakeDb.mothers.rows.m1.sync_error).toBe('মায়ের নাম আবশ্যক।');
  });

  it('keeps the op queued and stops the pass on a 5xx', async () => {
    seed(2);
    apiMock.mockRejectedValue(new ApiError(500, 'server down'));

    await syncNow();

    expect(fakeDb.outbox.rows).toHaveLength(2);
    expect(fakeDb.outbox.rows[0].attempts).toBe(1);
    expect(fakeDb.mothers.rows.m1.sync_status).toBe('pending');
    expect(apiMock).toHaveBeenCalledTimes(1); // stopped after the first failure
  });

  it('records the server id and clears the outbox on success', async () => {
    seed(1);
    apiMock.mockResolvedValue({ data: { id: 77 } });

    await syncNow();

    expect(fakeDb.outbox.rows).toHaveLength(0);
    expect(fakeDb.mothers.rows.m1.server_id).toBe(77);
    expect(fakeDb.mothers.rows.m1.sync_status).toBe('synced');
  });
});
