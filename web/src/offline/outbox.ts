// The offline outbox: queued writes with a client-generated UUID so a record created offline has a
// stable id before the server ever sees it (SURAHA_BUILD_PROMPT §1.1(2)). Kinds are open strings so
// each module (pregnancy capture, complaint filing, appointment booking…) can enqueue its own writes.

import { OUTBOX_STORE, idbPut, idbDelete, idbGetAll } from './db';

export type OutboxStatus = 'pending' | 'syncing' | 'failed';

export type OutboxItem = {
  id: string; // client UUID — also the optimistic record id
  kind: string; // e.g. 'complaint.create', 'appointment.create', 'pregnancy.create'
  endpoint: string; // API path relative to the base URL, e.g. '/complaints'
  method: 'POST' | 'PUT' | 'PATCH';
  payload: unknown; // JSON-serializable body
  label?: string; // human-readable summary for the "pending sync" UI (Bangla)
  createdAt: number;
  attempts: number;
  status: OutboxStatus;
  lastError?: string;
};

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for older engines.
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

export type EnqueueInput = Pick<OutboxItem, 'kind' | 'endpoint' | 'method' | 'payload'> &
  Partial<Pick<OutboxItem, 'id' | 'label'>>;

export async function enqueue(input: EnqueueInput): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: input.id ?? newId(),
    kind: input.kind,
    endpoint: input.endpoint,
    method: input.method,
    payload: input.payload,
    label: input.label,
    createdAt: Date.now(),
    attempts: 0,
    status: 'pending',
  };
  await idbPut(OUTBOX_STORE, item);
  return item;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const items = await idbGetAll<OutboxItem>(OUTBOX_STORE);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export const saveItem = (item: OutboxItem) => idbPut(OUTBOX_STORE, item);
export const removeItem = (id: string) => idbDelete(OUTBOX_STORE, id);
