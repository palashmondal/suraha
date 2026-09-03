import { api } from './client';

export interface TrackTimelineNode {
  label: string;
  timestamp: string | null;
  done: boolean;
}

export interface TrackResult {
  type: 'complaint' | 'appointment';
  type_label: string;
  token: string;
  title: string;
  applicant: string;
  date: string | null;
  status: string;
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  timeline: TrackTimelineNode[];
}

/** Public status lookup — no auth. */
export const trackByToken = (token: string) =>
  api<TrackResult>(`/track/${encodeURIComponent(token)}`, { auth: false });

export interface MySubmission {
  type: 'complaint' | 'appointment';
  type_label: string;
  token: string;
  title: string;
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  date: string | null;
}

export const getMySubmissions = () => api<{ submissions: MySubmission[] }>('/my/submissions');
