import { api } from './client';

export interface Complaint {
  id: number;
  tracking_token: string | null;
  status: 'filed' | 'scheduled' | 'assigned' | 'resolved' | 'rejected';
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  title: string;
  complainant_name: string;
  union: string | null;
  ward_no: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  mobile: string | null;
  complaint_date: string | null;
  complaint_time: string | null;
  description: string | null;
  schedule_date: string | null;
  investigating_officer_id: number | null;
  investigating_officer: string | null;
  findings: string | null;
  resolution_note: string | null;
  filed_at: string | null;
  scheduled_at: string | null;
  assigned_at: string | null;
  resolved_at: string | null;
  rejected_at: string | null;
}

export interface ComplaintTab {
  key: 'all' | 'filed' | 'scheduled' | 'assigned' | 'resolved';
  total: number;
}

export interface ComplaintList {
  data: Complaint[];
  meta: { current_page: number; last_page: number; total: number };
  tabs: ComplaintTab[];
}

export interface Investigator {
  id: number;
  name: string;
  designation: string | null;
}

export function listComplaints(params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<ComplaintList>(`/complaints${suffix}`);
}

export const getComplaint = (id: string | number) => api<{ data: Complaint }>(`/complaints/${id}`);

export const createComplaint = (body: Record<string, unknown>) =>
  api<{ data: Complaint }>('/complaints', { method: 'POST', body });

export const listInvestigators = () =>
  api<{ investigators: Investigator[] }>('/complaint-investigators');

const action = (id: number, verb: string, body: Record<string, unknown>) =>
  api<{ data: Complaint }>(`/complaints/${id}/${verb}`, { method: 'POST', body });

export const scheduleComplaint = (id: number, schedule_date: string) => action(id, 'schedule', { schedule_date });
export const assignComplaint = (id: number, investigating_officer_id: number) => action(id, 'assign', { investigating_officer_id });
export const resolveComplaint = (id: number, resolution_note?: string) => action(id, 'resolve', { resolution_note });
export const rejectComplaint = (id: number, resolution_note?: string) => action(id, 'reject', { resolution_note });
export const submitFindings = (id: number, findings: string) => action(id, 'findings', { findings });
