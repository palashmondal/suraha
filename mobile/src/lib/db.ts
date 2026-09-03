import Dexie, { type Table } from 'dexie';
import type { MotherFields, MotherRecord, OutboxItem } from '../data/mother';
import { decryptJson, encryptJson } from './crypto';

// Local-first store. The UI reads/writes here only; the sync engine is the sole thing that talks
// to the network. IndexedDB (via Dexie) works both in the browser dev build and in the Capacitor
// Android WebView, so the same code runs everywhere.
//
// IndexedDB itself is plaintext, so every identifying field lives inside the encrypted `enc` blob
// (see crypto.ts); only sync bookkeeping stays readable, because the sync engine needs to index
// and update it. Records are namespaced per upazila so switching upazila can't mix data.

/** A row as it sits in IndexedDB: bookkeeping in the clear, all §8.1 fields inside `enc`. */
export interface StoredMother {
  local_id: string;
  server_id?: number | null;
  sync_status: MotherRecord['sync_status'];
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
  enc: string;
}

class SurahaDb extends Dexie {
  mothers!: Table<StoredMother, string>;
  outbox!: Table<OutboxItem, number>;

  constructor(slug: string) {
    super(`suraha_fwa_${slug}`);
    this.version(1).stores({
      mothers: 'local_id, server_id, sync_status, mother_name_bn, updated_at',
      outbox: '++id, local_id, created_at',
    });
    // v2 drops the mother_name_bn index — the name is encrypted now, and search always filtered
    // in memory anyway. Pre-v2 rows (dev builds only, the app never shipped unencrypted) are read
    // back as plaintext by fromStored and re-encrypted on the next save.
    this.version(2).stores({
      mothers: 'local_id, server_id, sync_status, updated_at',
      outbox: '++id, local_id, created_at',
    });
  }
}

let dbInstance: SurahaDb | null = null;
let dbSlug: string | null = null;

/** Get (or open) the DB for a upazila. Reopens if the upazila changed. */
export function db(slug: string): SurahaDb {
  if (!dbInstance || dbSlug !== slug) {
    dbInstance = new SurahaDb(slug);
    dbSlug = slug;
  }
  return dbInstance;
}

export async function toStored(m: MotherRecord): Promise<StoredMother> {
  const { local_id, server_id, sync_status, sync_error, created_at, updated_at, ...fields } = m;
  return {
    local_id,
    server_id,
    sync_status,
    sync_error,
    created_at,
    updated_at,
    enc: await encryptJson(fields),
  };
}

export async function fromStored(row: StoredMother): Promise<MotherRecord> {
  const { enc, ...meta } = row;
  const fields = enc
    ? await decryptJson<MotherFields>(enc)
    : (row as unknown as MotherFields); // pre-v2 plaintext row
  return { ...fields, ...meta };
}
