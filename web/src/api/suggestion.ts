import { api } from './client';
import type { CaseNote } from './notes';
import type { Attachment } from './attachments';
import type { Kind, Tab } from './assistance';

export interface Suggestion {
  id: number;
  tracking_token: string | null;
  status: string;
  status_label: string;
  status_tone: 'pending' | 'success' | 'danger' | 'info';
  kind: string;
  kind_label: string;
  is_confidential: boolean;
  is_important: boolean;
  /** null on a confidential suggestion — the API does not send it. */
  applicant_name: string | null;
  mobile: string | null;
  ward_no: number | null;
  address: string | null;
  union?: string | null;
  title: string;
  description: string;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string | null;
  attachments?: Attachment[];
  notes?: CaseNote[]; // only on the detail response
}

export interface SuggestionList {
  data: Suggestion[];
  meta: { current_page: number; last_page: number; total: number };
  tabs: Tab[];
  kinds: Kind[];
}

export const listSuggestions = (params: { status?: string; kind?: string; q?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.kind) qs.set('kind', params.kind);
  if (params.q) qs.set('q', params.q);

  return api<SuggestionList>(`/suggestions${qs.toString() ? `?${qs}` : ''}`);
};

export const getSuggestion = (id: string | number) => api<{ data: Suggestion }>(`/suggestions/${id}`);

export const createSuggestion = (body: Record<string, unknown>) =>
  api<{ data: Suggestion }>('/suggestions', { method: 'POST', body });

export const acceptSuggestion = (id: number, decision_note?: string) =>
  api<{ data: Suggestion }>(`/suggestions/${id}/accept`, { method: 'POST', body: { decision_note } });

export const rejectSuggestion = (id: number, decision_note?: string) =>
  api<{ data: Suggestion }>(`/suggestions/${id}/reject`, { method: 'POST', body: { decision_note } });

// The UNO's গুরুত্বপূর্ণ mark — set and unset from the detail page, filtered by its own tab.
export const setSuggestionImportant = (id: number, is_important: boolean) =>
  api<{ data: Suggestion }>(`/suggestions/${id}/important`, { method: 'PATCH', body: { is_important } });

// UNO's running কার্যক্রম notes — both return the পরামর্শ with the note list as it now stands.
export const addSuggestionNote = (id: number, body: string) =>
  api<{ data: Suggestion }>(`/suggestions/${id}/notes`, { method: 'POST', body: { body } });

export const deleteSuggestionNote = (id: number, noteId: number) =>
  api<{ data: Suggestion }>(`/suggestions/${id}/notes/${noteId}`, { method: 'DELETE' });
