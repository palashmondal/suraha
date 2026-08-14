import { api } from './client';

export type ComplaintStatus = 'pending' | 'assigned' | 'completed' | 'rejected';

export interface TimelineAttachment {
  url: string;
  original_name: string | null;
  kind: 'pdf' | 'image';
}

export interface TimelineEntry {
  id: number;
  type: 'filed' | 'accepted' | 'rejected' | 'report' | 'hearing_scheduled' | 'reinvestigation' | 'completed';
  label: string;
  actor_name: string | null;
  actor_role: string | null;
  comment: string | null;
  meta: Record<string, unknown> | null;
  at: string | null;
  attachments: TimelineAttachment[];
}

export interface Complaint {
  id: number;
  tracking_token: string | null;
  status: ComplaintStatus;
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
  investigating_officer_id: number | null;
  investigating_officer: string | null;
  due_date: string | null;
  hearing_date: string | null;
  filed_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  timeline?: TimelineEntry[];
}

export interface ComplaintTab {
  key: 'all' | ComplaintStatus;
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

export interface Hearing {
  id: number;
  title: string;
  complainant_name: string;
  hearing_date: string | null;
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

export const listHearings = () => api<{ hearings: Hearing[] }>('/complaint-hearings');

const action = (id: number, verb: string, body: Record<string, unknown>) =>
  api<{ data: Complaint }>(`/complaints/${id}/${verb}`, { method: 'POST', body });

export const acceptComplaint = (
  id: number,
  body: { investigating_officer_id: number; due_date: string; comment?: string },
) => action(id, 'accept', body);

export const rejectComplaint = (id: number, comment?: string) => action(id, 'reject', { comment });

export const scheduleHearing = (id: number, body: { hearing_date: string; comment?: string }) =>
  action(id, 'schedule-hearing', body);

export const completeComplaint = (id: number, comment: string) => action(id, 'complete', { comment });

export const reinvestigate = (id: number, body: { comment: string; due_date?: string }) =>
  action(id, 'reinvestigate', body);

// The report carries files, so it goes as multipart/form-data (the api client handles FormData).
export const submitReport = (id: number, form: FormData) =>
  api<{ data: Complaint }>(`/complaints/${id}/report`, { method: 'POST', body: form });
