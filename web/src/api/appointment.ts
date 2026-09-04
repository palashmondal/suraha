import { api } from './client';
import type { CaseNote } from './notes';
import { googleCalendarUrl as buildGoogleCalendarUrl } from '../utils/googleCalendar';

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
  office: string; // "উপজেলা নির্বাহী অফিসারের কার্যালয়, ডুমুরিয়া, খুলনা" — the venue, always
  created_at: string | null;
  notes?: CaseNote[]; // only on the detail response
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

export function listAppointments(params: { status?: string; q?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<AppointmentList>(`/appointments${suffix}`);
}

export interface ScheduledAppointment {
  id: number;
  applicant_name: string;
  purpose: string;
  appointment_date: string | null;
  appointment_time: string | null;
}

export const getAppointment = (id: string | number) => api<{ data: Appointment }>(`/appointments/${id}`);

export const createAppointment = (body: Record<string, unknown>) =>
  api<{ data: Appointment }>('/appointments', { method: 'POST', body });

export const listAppointmentSchedule = () =>
  api<{ appointments: ScheduledAppointment[]; feed_url: string }>('/appointment-schedule');

// The সাক্ষাৎকার flavour of the shared builder — a 30-minute slot at the UNO office.
export const googleCalendarUrl = (a: Appointment) =>
  buildGoogleCalendarUrl({
    title: `সাক্ষাতকার: ${a.applicant_name} — ${a.purpose}`,
    date: a.appointment_date,
    time: a.appointment_time,
    details: [a.description, a.mobile && `মোবাইল: ${a.mobile}`],
    location: a.office,
  });

const action = (id: number, verb: string, body: Record<string, unknown> = {}) =>
  api<{ data: Appointment }>(`/appointments/${id}/${verb}`, { method: 'POST', body });

// UNO accepts — confirming or modifying the proposed time — or rejects; both notify the citizen.
export const approveAppointment = (
  id: number,
  body: { appointment_date?: string; appointment_time?: string; decision_note?: string } = {},
) => action(id, 'approve', body);

export const rejectAppointment = (id: number, decision_note?: string) => action(id, 'reject', { decision_note });

// UNO's own running notes — both return the appointment with the note list as it now stands.
export const addAppointmentNote = (id: number, body: string) => action(id, 'notes', { body });

export const deleteAppointmentNote = (id: number, noteId: number) =>
  api<{ data: Appointment }>(`/appointments/${id}/notes/${noteId}`, { method: 'DELETE' });
