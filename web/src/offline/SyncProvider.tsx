import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, isNetworkError } from '../api/client';
import { useOnlineStatus } from './useOnlineStatus';
import {
  enqueue,
  listOutbox,
  removeItem,
  saveItem,
  type EnqueueInput,
  type OutboxItem,
} from './outbox';

// SyncProvider owns the offline outbox lifecycle: submit-or-queue, and flushing the queue whenever
// connectivity returns. The FWA capture path always queues (offline-first); citizen submits try the
// network first and fall back to the queue only on a connection error (SURAHA_BUILD_PROMPT §1.1(2)).

type SubmitResult =
  | { ok: true; queued: false; data: unknown } // reached the server
  | { ok: true; queued: true; item: OutboxItem }; // stored offline, will sync

type SyncContextValue = {
  online: boolean;
  pending: OutboxItem[];
  pendingCount: number;
  /** Try the network, fall back to the outbox on connection loss. For citizen/officer online writes. */
  submit: (input: EnqueueInput) => Promise<SubmitResult>;
  /** Always queue first (offline-first). For FWA field capture. */
  queue: (input: EnqueueInput) => Promise<OutboxItem>;
  /** Attempt to flush the outbox now. */
  syncNow: () => Promise<void>;
  syncing: boolean;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within <SyncProvider>');
  return ctx;
}

async function flushItem(item: OutboxItem): Promise<'done' | 'retry'> {
  try {
    await apiFetch(item.endpoint, {
      method: item.method,
      body: JSON.stringify({ ...(item.payload as object), client_id: item.id }),
    });
    await removeItem(item.id);
    return 'done';
  } catch (err) {
    if (isNetworkError(err)) {
      await saveItem({ ...item, status: 'pending', attempts: item.attempts + 1 });
      return 'retry'; // transient — leave queued
    }
    // Server rejected the payload (4xx): mark failed so it stops blocking the queue and surfaces in UI.
    await saveItem({
      ...item,
      status: 'failed',
      attempts: item.attempts + 1,
      lastError: err instanceof Error ? err.message : String(err),
    });
    return 'done';
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await listOutbox());
    } catch {
      setPending([]);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const items = (await listOutbox()).filter((i) => i.status !== 'failed');
      for (const item of items) {
        const result = await flushItem(item);
        if (result === 'retry') break; // still offline — stop, keep order
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const queue = useCallback(
    async (input: EnqueueInput) => {
      const item = await enqueue(input);
      await refresh();
      if (online) void syncNow();
      return item;
    },
    [online, refresh, syncNow],
  );

  const submit = useCallback(
    async (input: EnqueueInput): Promise<SubmitResult> => {
      const id =
        input.id ??
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined);
      if (online) {
        try {
          const data = await apiFetch(input.endpoint, {
            method: input.method,
            body: JSON.stringify({ ...(input.payload as object), client_id: id }),
          });
          return { ok: true, queued: false, data };
        } catch (err) {
          if (!isNetworkError(err)) throw err; // real rejection — let the caller show it
        }
      }
      const item = await queue({ ...input, id });
      return { ok: true, queued: true, item };
    },
    [online, queue],
  );

  // Load the queue once, and flush whenever we come back online.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (online) void syncNow();
  }, [online, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      online,
      pending,
      pendingCount: pending.filter((p) => p.status !== 'failed').length,
      submit,
      queue,
      syncNow,
      syncing,
    }),
    [online, pending, submit, queue, syncNow, syncing],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
