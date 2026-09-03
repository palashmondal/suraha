import { api } from './client';

/** ঝুঁকি মাত্রা — see App\Support\VulnerabilityIndex for what the number means and where it comes from. */
export interface Vulnerability {
  /** 0–100, or null when too little is known to score the record honestly. */
  score: number | null;
  points: number;
  band: 'low' | 'moderate' | 'high' | 'unknown';
  label_bn: string;
  known_inputs: number;
  factors: { label: string; points: number }[];
}

// Mirrors PregnancyResource on the API.
export interface Pregnancy {
  id: number;
  delivery_status: 'not_delivered' | 'delivered';
  delivery_status_label: string;
  delivery_status_tone: 'pending' | 'success' | 'danger' | 'info';

  mother_name_bn: string;
  mother_name_en: string | null;
  husband_name: string | null;
  husband_name_en: string | null;
  mother_nid: string | null;
  mother_birth_reg_no: string | null;
  father_nid: string | null;
  father_birth_reg_no: string | null;
  register_no: string | null;
  which_child: number | null;
  child_name?: string | null;
  height_inch: number | null;
  weight_kg: number | null;
  current_age: number | null;
  marriage_age: number | null;
  blood_group: string | null;
  chronic_diseases: string[];

  union_id: number | null;
  union: string | null;
  upazila?: string | null;
  district?: string | null;
  ward_no: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  mobile: string | null;

  tt_vaccine_count: number | null;
  last_tt_date: string | null;
  last_menstruation_date: string | null;
  gravida_count: number | null;
  prior_miscarriages: number | null;
  last_child_age: number | null;
  prior_normal_deliveries: number | null;
  prior_cesarean_deliveries: number | null;
  prior_delivery_place: string | null;

  birth_registration_id?: number | null;
  birth_registration_no?: string | null;
  birth_registration_status?: 'pending_entry' | 'entered' | null;

  expected_delivery_date: string | null;
  delivery_place_plan: string | null;
  emergency_transport: boolean | null;
  enough_money: boolean | null;
  blood_donor_arranged: boolean | null;

  actual_delivery_date: string | null;
  mother_alive: boolean | null;
  delivery_type: string | null;
  delivery_place: string | null;
  newborn_count: number | null;
  newborn_alive: boolean | null;
  baby_sex: string | null;
  birth_weight_kg: number | null;
  birth_height_inch: number | null;
  birth_time: string | null;

  vulnerability: Vulnerability;
  created_at: string | null;
}

export interface TabCount {
  key: 'all' | 'not_delivered' | 'delivered';
  total: number;
  new: number;
}

export interface PregnancyList {
  data: Pregnancy[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
  tabs: TabCount[];
}

export function listPregnancies(params: { status?: string; q?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<PregnancyList>(`/pregnancies${suffix}`);
}

export function getPregnancy(id: string | number) {
  return api<{ data: Pregnancy }>(`/pregnancies/${id}`);
}

export function createPregnancy(payload: Record<string, unknown>) {
  return api<{ data: Pregnancy }>('/pregnancies', { method: 'POST', body: payload });
}

export interface DeliveryPayload {
  delivery_status: 'not_delivered' | 'delivered';
  /** Optional — often no name has been chosen the day she delivers. */
  child_name?: string;
  actual_delivery_date?: string;
  mother_alive?: boolean;
  delivery_type?: string;
  delivery_place?: string;
  newborn_count?: number;
  newborn_alive?: boolean;
  baby_sex?: string;
  birth_weight_kg?: number;
  birth_height_inch?: number;
  birth_time?: string;
}

export function updateDeliveryStatus(id: string | number, payload: DeliveryPayload) {
  return api<{ data: Pregnancy }>(`/pregnancies/${id}/delivery-status`, {
    method: 'PATCH',
    body: payload,
  });
}
