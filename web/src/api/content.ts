import { api } from './client';

export interface Slider {
  id: number;
  title: string;
  image_url: string | null;
  link: string | null;
  slide_date: string | null;
  is_active: boolean;
}

export interface InfoItem {
  id: number;
  type: 'phone' | 'about';
  title: string;
  value: string;
}

// ---- Sliders ----
export const getPublicSliders = () => api<{ sliders: Slider[] }>('/sliders', { auth: false });
export const listSliders = () => api<{ sliders: Slider[] }>('/manage/sliders');
export const createSlider = (form: FormData) => api<{ data: Slider }>('/manage/sliders', { method: 'POST', body: form });
export const toggleSlider = (id: number, is_active: boolean) =>
  api<{ data: Slider }>(`/manage/sliders/${id}`, { method: 'POST', body: { is_active } });
export const deleteSlider = (id: number) => api(`/manage/sliders/${id}`, { method: 'DELETE' });

// ---- General Info ----
export const getPublicGeneralInfo = () =>
  api<{ phones: InfoItem[]; about: InfoItem[] }>('/general-info', { auth: false });
export const listGeneralInfo = () =>
  api<{ phones: InfoItem[]; about: InfoItem[] }>('/manage/general-info');
export const createInfo = (body: { type: string; title: string; value: string }) =>
  api<{ item: InfoItem }>('/manage/general-info', { method: 'POST', body });
export const updateInfo = (id: number, body: Partial<{ title: string; value: string }>) =>
  api<{ item: InfoItem }>(`/manage/general-info/${id}`, { method: 'PUT', body });
export const deleteInfo = (id: number) => api(`/manage/general-info/${id}`, { method: 'DELETE' });
