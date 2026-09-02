import { api } from './client';

export interface Assistance {
  id: number;
  tracking_token: string | null;
  status: string;
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  kind: string;
  kind_label: string;
  applicant_name: string;
  mobile: string | null;
  nid: string | null;
  address: string | null;
  ward_no: number | null;
  union?: string | null;
  title: string;
  description: string | null;
  amount_requested: number | null;
  amount_approved: number | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string | null;
}

export interface Kind { value: string; label: string }
export interface Tab { key: string; total: number }

export interface AssistanceList {
  data: Assistance[];
  meta: { current_page: number; last_page: number; total: number };
  tabs: Tab[];
  kinds: Kind[];
}

export const listAssistances = (params: { status?: string; kind?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.kind) qs.set('kind', params.kind);
  if (params.q) qs.set('q', params.q);

  return api<AssistanceList>(`/assistances${qs.toString() ? `?${qs}` : ''}`);
};

export const getAssistance = (id: string | number) => api<{ data: Assistance }>(`/assistances/${id}`);

export const createAssistance = (body: Record<string, unknown>) =>
  api<{ data: Assistance }>('/assistances', { method: 'POST', body });

export const approveAssistance = (id: number, body: Record<string, unknown>) =>
  api<{ data: Assistance }>(`/assistances/${id}/approve`, { method: 'POST', body });

export const rejectAssistance = (id: number, decision_note?: string) =>
  api<{ data: Assistance }>(`/assistances/${id}/reject`, { method: 'POST', body: { decision_note } });
