import Dexie, { type Table } from 'dexie';
import type { MotherRecord, OutboxItem } from '../data/mother';

// Local-first store. The UI reads/writes here only; the sync engine is the sole thing that talks
// to the network. IndexedDB (via Dexie) works both in the browser dev build and in the Capacitor
// Android WebView, so the same code runs everywhere. (SQLCipher-encrypted storage is a later
// hardening step — see FWA_MOBILE_APP_PLAN §7.)
//
// Records are namespaced per upazila so switching upazila can't mix data.
class SurahaDb extends Dexie {
  mothers!: Table<MotherRecord, string>;
  outbox!: Table<OutboxItem, number>;

  constructor(slug: string) {
    super(`suraha_fwa_${slug}`);
    this.version(1).stores({
      mothers: 'local_id, server_id, sync_status, mother_name_bn, updated_at',
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
