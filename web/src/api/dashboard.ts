import { api } from './client';

export interface DashboardStats {
  scope: { level: 'tenant' | 'district' | 'global'; label: string; upazila_count: number };
  officers: { total: number; fwa: number; sochib: number; investigators: number };
  pregnancy: { today_new: number; total: number; delivered: number };
  birth: { today_new: number; total: number; pending_entry: number };
  complaints: { total: number; unresolved: number; resolved: number };
  appointments: { total: number; pending: number; approved: number };
}

export const getDashboardStats = () => api<DashboardStats>('/dashboard/stats');
