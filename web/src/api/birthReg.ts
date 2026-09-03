import { api, downloadFile } from './client';

export interface BirthReg {
  id: number;
  registration_no: string | null;
  status: 'pending_entry' | 'entered';
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  child_name: string | null;
  mother_name: string;
  father_name: string | null;
  union: string | null;
  ward_no: number | null;
  date_of_birth: string | null;
  sex: string | null;
  pregnancy_id: number | null;
  has_certificate: boolean;
  created_at: string | null;
}

export interface BirthRegTab {
  key: 'all' | 'pending_entry' | 'entered';
  total: number;
}

export interface BirthRegList {
  data: BirthReg[];
  meta: { current_page: number; last_page: number; total: number };
  tabs: BirthRegTab[];
}

export function listBirthRegs(params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<BirthRegList>(`/birth-registrations${suffix}`);
}

/** Sochib approval of a delivered pregnancy → BDRIS → certificate. */
export function approvePregnancy(
  pregnancyId: number,
  overrides: { child_name?: string; father_name?: string } = {},
) {
  return api<{ data: BirthReg }>(`/pregnancies/${pregnancyId}/approve`, {
    method: 'POST',
    body: overrides,
  });
}

export function downloadCertificate(reg: BirthReg) {
  return downloadFile(
    `/birth-registrations/${reg.id}/certificate`,
    `birth-certificate-${reg.registration_no ?? reg.id}.html`,
  );
}
