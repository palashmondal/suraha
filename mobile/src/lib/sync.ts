import { db, fromStored } from './db';
import { api, ApiError } from './api';
import { isOnline } from './net';
import { getSelectedUpazila } from './tenant';
import { toApiPayload } from '../data/mother';

// The ONLY component that talks to the network. Drains the outbox FIFO; the UI just writes local
// records + outbox items and lets this run on app-open, on reconnect, or on a manual "Sync now".

let running = false;
const listeners = new Set<() => void>();

/** Subscribe to sync-state changes (to refresh badges / pending counts). */
export function onSyncChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

export function isSyncing(): boolean {
  return running;
}

export async function syncNow(): Promise<void> {
  if (running) return;
  if (!(await isOnline())) return;
  const u = await getSelectedUpazila();
  if (!u) return;

  running = true;
  notify();
  const d = db(u.slug);

  try {
    // FIFO — process oldest queued op first so create precedes its later updates.
    const items = await d.outbox.orderBy('id').toArray();
    for (const item of items) {
      const row = await d.mothers.get(item.local_id);
      if (!row) {
        await d.outbox.delete(item.id!);
        continue;
      }
      const mother = await fromStored(row);

      try {
        await d.mothers.update(mother.local_id, { sync_status: 'syncing' });
        notify();

        if (item.op === 'create') {
          const res = await api<{ data: { id: number } }>('/pregnancies', {
            method: 'POST',
            body: toApiPayload(mother),
          });
          await d.mothers.update(mother.local_id, { server_id: res.data.id, sync_status: 'synced', sync_error: null });
        } else if (item.op === 'update') {
          if (!mother.server_id) throw new ApiError(0, 'server id missing');
          await api(`/pregnancies/${mother.server_id}`, { method: 'PUT', body: toApiPayload(mother) });
          await d.mothers.update(mother.local_id, { sync_status: 'synced', sync_error: null });
        } else if (item.op === 'delivery') {
          if (!mother.server_id) throw new ApiError(0, 'server id missing');
          await api(`/pregnancies/${mother.server_id}/delivery-status`, { method: 'PATCH', body: item.payload });
          await d.mothers.update(mother.local_id, { sync_status: 'synced', sync_error: null });
        }

        await d.outbox.delete(item.id!);
      } catch (e) {
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          // A validation/permission error won't fix itself — surface it and drop the op so the
          // queue isn't stuck; the record shows an error state for the FWA to edit & resave.
          await d.mothers.update(mother.local_id, { sync_status: 'error', sync_error: e.message });
          await d.outbox.delete(item.id!);
        } else {
          // Network / 5xx — leave it queued to retry on the next sync; stop this pass.
          await d.mothers.update(mother.local_id, { sync_status: 'pending', sync_error: null });
          await d.outbox.update(item.id!, { attempts: item.attempts + 1, last_error: String(e) });
          break;
        }
      }
      notify();
    }
  } finally {
    running = false;
    notify();
  }
}
