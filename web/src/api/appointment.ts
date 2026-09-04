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
  office: string; // "উপজেলা নির্বাহী অফিসারের কার্যালয়, ডুমুরিয়া, খুলনা" — the venue, always
  created_at: string | null;
  notes?: AppointmentNote[]; // only on the detail response
}

export interface AppointmentNote {
  id: number;
  body: string;
  author: string | null;
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

// A one-off "add this to my Google Calendar" link — plain URL, no account linking (§8.3, optional).
// Times are Asia/Dhaka (+06:00, no DST); a 30-minute slot, matching the .ics feed.
export function googleCalendarUrl(a: Appointment): string | null {
  if (!a.appointment_date) return null;

  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace('.000', '');
  let dates: string;
  if (a.appointment_time) {
    const start = new Date(`${a.appointment_date}T${a.appointment_time.slice(0, 5)}:00+06:00`);
    const end = new Date(start.getTime() + 30 * 60_000);
    dates = `${stamp(start.toISOString().slice(0, 19))}Z/${stamp(end.toISOString().slice(0, 19))}Z`;
  } else {
    const day = a.appointment_date.replace(/-/g, '');
    const next = new Date(`${a.appointment_date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dates = `${day}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }

  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: `সাক্ষাতকার: ${a.applicant_name} — ${a.purpose}`,
    dates,
    details: [a.description, a.mobile && `মোবাইল: ${a.mobile}`].filter(Boolean).join('\n'),
    // Google Calendar geocodes this and links it to Maps itself.
    location: a.office,
    ctz: 'Asia/Dhaka',
  });
  return `https://calendar.google.com/calendar/render?${qs}`;
}

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
