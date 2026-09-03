// The প্রসূতি (mother) record — mirrors the web/API §8.1 fields the FWA fills. Only mother_name_bn
// is required (matches the backend), so a half-filled record still saves offline.

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface MotherFields {
  mother_name_bn: string;
  mother_name_en?: string | null;
  husband_name?: string | null;
  husband_name_en?: string | null;
  // Parent identity — a BDRIS birth-registration application needs the parents' NID and/or their
  // own birth-registration numbers. "Father" is the child's father, i.e. husband_name above.
  mother_nid?: string | null;
  mother_birth_reg_no?: string | null;
  father_nid?: string | null;
  father_birth_reg_no?: string | null;
  register_no?: string | null;
  which_child?: number | null;
  current_age?: number | null;
  marriage_age?: number | null;
  blood_group?: string | null;
  height_inch?: number | null;
  weight_kg?: number | null;

  ward_no?: number | null;
  address?: string | null;
  mobile?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  tt_vaccine_count?: number | null;
  last_tt_date?: string | null;
  last_menstruation_date?: string | null;
  gravida_count?: number | null;
  prior_miscarriages?: number | null;
  expected_delivery_date?: string | null;
  delivery_plan?: string | null;
}

export interface MotherRecord extends MotherFields {
  local_id: string; // client UUID, primary key on-device + idempotency key for the server
  server_id?: number | null;
  sync_status: SyncStatus;
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
}

export type OutboxOp = 'create' | 'update' | 'delivery';

export interface OutboxItem {
  id?: number; // auto-increment
  local_id: string;
  op: OutboxOp;
  payload: Record<string, unknown>;
  attempts: number;
  last_error?: string | null;
  created_at: string;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const DELIVERY_PLANS = [
  'বাড়িতে',
  'উপজেলা স্বাস্থ্য কমপ্লেক্স',
  'জেলা হাসপাতাল',
  'বেসরকারি হাসপাতাল/ক্লিনিক',
];

/** Fields sent to POST /api/pregnancies (drops local bookkeeping, keeps the API contract). */
export function toApiPayload(m: MotherRecord): Record<string, unknown> {
  const {
    local_id, server_id, sync_status, sync_error, created_at, updated_at, ...fields
  } = m;
  void server_id; void sync_status; void sync_error; void created_at; void updated_at;
  return { ...fields, client_uuid: local_id };
}
