import { api, downloadFile } from './client';

export interface BirthReg {
  id: number;
  registration_no: string | null;
  status: 'pending_entry' | 'entered';
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  child_name: string | null;
  child_name_en: string | null;
  mother_name: string;
  mother_name_en: string | null;
  mother_nid: string | null;
  mother_birth_reg_no: string | null;
  mother_nationality: string | null;
  father_name: string | null;
  father_name_en: string | null;
  father_nid: string | null;
  father_birth_reg_no: string | null;
  father_nationality: string | null;
  place_of_birth: string | null;
  permanent_address: string | null;
  union: string | null;
  upazila?: string | null;
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

export function getBirthReg(id: string | number) {
  return api<{ data: BirthReg }>(`/birth-registrations/${id}`);
}

export function listBirthRegs(params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<BirthRegList>(`/birth-registrations${suffix}`);
}

/** The certificate form's fields — what the সচিব fills in and what BDRIS is given. */
export interface CertificateForm {
  child_name: string | null;
  child_name_en: string | null;
  date_of_birth: string | null;
  sex: string | null;
  mother_name: string | null;
  mother_name_en: string | null;
  mother_nid: string | null;
  mother_birth_reg_no: string | null;
  mother_nationality: string | null;
  father_name: string | null;
  father_name_en: string | null;
  father_nid: string | null;
  father_birth_reg_no: string | null;
  father_nationality: string | null;
  ward_no: number | null;
  place_of_birth: string | null;
  permanent_address: string | null;
}

/**
 * The certificate form's starting values, prefilled from the mother's record (blank where she
 * never gave one). `already_registered` means this pregnancy has been filed — the response is then
 * the filed record, not a draft, because approval is idempotent.
 */
export function birthRegDraft(pregnancyId: number) {
  return api<{ data: CertificateForm & { registration_no?: string | null }; already_registered: boolean }>(
    `/pregnancies/${pregnancyId}/birth-registration-draft`,
  );
}

/** Sochib approval of a delivered pregnancy → BDRIS → certificate. */
export function approvePregnancy(pregnancyId: number, form: Partial<CertificateForm> = {}) {
  return api<{ data: BirthReg }>(`/pregnancies/${pregnancyId}/approve`, {
    method: 'POST',
    body: form,
  });
}

export function downloadCertificate(reg: BirthReg) {
  return downloadFile(
    `/birth-registrations/${reg.id}/certificate`,
    `birth-certificate-${reg.registration_no ?? reg.id}.html`,
  );
}
