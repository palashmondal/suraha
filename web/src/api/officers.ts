import { api } from './client';

export interface Officer {
  id: number;
  name: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  role_label_bn: string;
  designation: string | null;
  ward_no: number | null;
  union_id: number | null;
  tenant_id: string | null;
  is_active: boolean;
  upazila?: { id: string; name_bn: string };
}

export interface AssignableRole {
  value: string;
  label: string;
}


export const createOfficer = (body: Record<string, unknown>) =>
  api<{ data: Officer }>('/officers', { method: 'POST', body });

export const updateOfficer = (id: number, body: Record<string, unknown>) =>
  api<{ data: Officer }>(`/officers/${id}`, { method: 'PUT', body });

export const setOfficerActive = (id: number, is_active: boolean) =>
  api<{ data: Officer }>(`/officers/${id}/status`, { method: 'PATCH', body: { is_active } });

/** Single-holder posts that already have an active officer — keys are "tenant:union[:ward]". */
export interface FilledPosts {
  uno: string[];
  dc: number[];
  up_sochib: string[];
  fwa: string[];
}

export const getFilledPosts = () => api<FilledPosts>('/officer-posts');
