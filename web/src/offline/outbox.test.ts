import { beforeEach, describe, expect, it } from 'vitest';
import { OUTBOX_STORE, idbClear } from './db';
import { enqueue, listOutbox, newId, removeItem, saveItem, type OutboxItem } from './outbox';

const base = { kind: 'complaint.create', endpoint: '/complaints', method: 'POST' as const, payload: { title: 'x' } };

describe('offline outbox', () => {
  beforeEach(async () => {
    await idbClear(OUTBOX_STORE);
  });

  it('enqueues an item with a stable id and pending status', async () => {
    const item = await enqueue(base);
    expect(item.id).toBeTruthy();
    expect(item.status).toBe('pending');
    expect(item.attempts).toBe(0);

    const all = await listOutbox();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(item.id);
  });

  it('honours a caller-supplied id (optimistic record id)', async () => {
    const id = newId();
    const item = await enqueue({ ...base, id });
    expect(item.id).toBe(id);
  });

  it('lists items oldest-first by createdAt', async () => {
    const a = await enqueue({ ...base, label: 'a' });
    // Force a distinct, later createdAt so ordering is deterministic regardless of clock resolution.
    await saveItem({ ...a, createdAt: 1 });
    const b = await enqueue({ ...base, label: 'b' });
    await saveItem({ ...b, createdAt: 2 });

    const all = await listOutbox();
    expect(all.map((i) => i.label)).toEqual(['a', 'b']);
  });

  it('updates an item in place (e.g. marking it failed)', async () => {
    const item = await enqueue(base);
    const failed: OutboxItem = { ...item, status: 'failed', attempts: 1, lastError: 'HTTP 422' };
    await saveItem(failed);

    const all = await listOutbox();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe('failed');
    expect(all[0].lastError).toBe('HTTP 422');
  });

  it('removes an item', async () => {
    const item = await enqueue(base);
    await removeItem(item.id);
    expect(await listOutbox()).toHaveLength(0);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
  });
});
