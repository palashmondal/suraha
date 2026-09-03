import { v4 as uuid } from 'uuid';
import { db, fromStored, toStored } from './db';
import type { MotherFields, MotherRecord } from '../data/mother';
import { getSelectedUpazila } from './tenant';

async function slug(): Promise<string> {
  const u = await getSelectedUpazila();
  if (!u) throw new Error('উপজেলা নির্বাচন করা হয়নি।');
  return u.slug;
}

export async function listMothers(query?: string): Promise<MotherRecord[]> {
  const stored = await db(await slug()).mothers.orderBy('updated_at').reverse().toArray();
  const rows = await Promise.all(stored.map(fromStored));
  if (!query) return rows;
  const q = query.trim().toLowerCase();
  return rows.filter(
    (m) =>
      m.mother_name_bn?.toLowerCase().includes(q) ||
      (m.mobile ?? '').includes(q) ||
      (m.mother_name_en ?? '').toLowerCase().includes(q),
  );
}

export async function getMother(localId: string): Promise<MotherRecord | undefined> {
  const row = await db(await slug()).mothers.get(localId);
  return row ? fromStored(row) : undefined;
}

/** Create or update a mother locally and queue it for sync. Never touches the network. */
export async function saveMother(
  fields: MotherFields,
  localId?: string,
): Promise<MotherRecord> {
  const s = await slug();
  const now = new Date().toISOString();
  const d = db(s);

  let record: MotherRecord;
  let op: 'create' | 'update';

  if (localId) {
    const existing = await d.mothers.get(localId);
    if (!existing) throw new Error('রেকর্ডটি পাওয়া যায়নি।');
    record = { ...(await fromStored(existing)), ...fields, sync_status: 'pending', sync_error: null, updated_at: now };
    op = 'update';
  } else {
    record = {
      ...fields,
      local_id: uuid(),
      server_id: null,
      sync_status: 'pending',
      sync_error: null,
      created_at: now,
      updated_at: now,
    };
    op = 'create';
  }

  const stored = await toStored(record);
  await d.transaction('rw', d.mothers, d.outbox, async () => {
    await d.mothers.put(stored);
    await d.outbox.add({
      local_id: record.local_id,
      op,
      payload: {},
      attempts: 0,
      created_at: now,
    });
  });

  return record;
}

export async function pendingCount(): Promise<number> {
  return db(await slug()).outbox.count();
}

/** Queue a delivery confirmation. Syncs after the mother's create (FIFO guarantees ordering). */
export async function markDelivery(localId: string, actualDate: string): Promise<void> {
  const s = await slug();
  const d = db(s);
  const now = new Date().toISOString();
  await d.transaction('rw', d.mothers, d.outbox, async () => {
    await d.mothers.update(localId, { sync_status: 'pending', updated_at: now });
    await d.outbox.add({
      local_id: localId,
      op: 'delivery',
      payload: { delivery_status: 'delivered', actual_delivery_date: actualDate },
      attempts: 0,
      created_at: now,
    });
  });
}
