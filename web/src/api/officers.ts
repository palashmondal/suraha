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

export function listOfficers(tenantId?: string) {
  const suffix = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : '';
  return api<{ data: Officer[] }>(`/officers${suffix}`);
}

export const getAssignableRoles = () => api<{ roles: AssignableRole[] }>('/officer-roles');

export const createOfficer = (body: Record<string, unknown>) =>
  api<{ data: Officer }>('/officers', { method: 'POST', body });

export const setOfficerActive = (id: number, is_active: boolean) =>
  api<{ data: Officer }>(`/officers/${id}/status`, { method: 'PATCH', body: { is_active } });
