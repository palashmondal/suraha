import { api } from './client';

export interface Appointment {
  id: number;
  tracking_token: string | null;
  status: 'pending' | 'approved' | 'rejected';
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  applicant_name: string;
  union: string | null;
  ward_no: number | null;
  address: string | null;
  mobile: string | null;
  purpose: string;
  description: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  decision_note: string | null;
  created_at: string | null;
}

export interface AppointmentTab {
  key: 'all' | 'pending' | 'approved' | 'rejected';
  total: number;
}

export interface AppointmentList {
  data: Appointment[];
  meta: { current_page: number; last_page: number; total: number };
  tabs: AppointmentTab[];
}

export function listAppointments(params: { status?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<AppointmentList>(`/appointments${suffix}`);
}

export const getAppointment = (id: string | number) => api<{ data: Appointment }>(`/appointments/${id}`);

export const createAppointment = (body: Record<string, unknown>) =>
  api<{ data: Appointment }>('/appointments', { method: 'POST', body });

const action = (id: number, verb: string, body: Record<string, unknown> = {}) =>
  api<{ data: Appointment }>(`/appointments/${id}/${verb}`, { method: 'POST', body });

export const approveAppointment = (id: number, decision_note?: string) => action(id, 'approve', { decision_note });
export const rejectAppointment = (id: number, decision_note?: string) => action(id, 'reject', { decision_note });
export const rescheduleAppointment = (id: number, appointment_date: string, appointment_time?: string) =>
  action(id, 'reschedule', { appointment_date, appointment_time });
