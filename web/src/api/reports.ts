import { api } from './client';

export interface StatusSlice { name: string; value: number; tone: string }
export interface TrendPoint { month: string; pregnancies: number; births: number; complaints: number; appointments: number }
export interface FunnelStage { stage: string; count: number }
export interface UnionRow { name: string; pregnancies: number; complaints: number; appointments: number }
export interface UpazilaRow {
  name: string; pregnancies: number; deliveries: number; births: number;
  complaints_resolved: number; appointments_approved: number;
}

export interface ReportBundle {
  scope: { level: 'tenant' | 'district' | 'global'; label: string; upazila_count: number };
  filters: { from: string | null; to: string | null; union_id: string | null; ward_no: string | null };
  kpis: {
    pregnancies_total: number; delivery_rate: number;
    births_issued: number; births_pending: number;
    complaints_total: number; resolution_rate: number; avg_resolution_days: number;
    appointments_total: number; approval_rate: number; officers: number;
  };
  trends: TrendPoint[];
  status: { pregnancy: StatusSlice[]; birth: StatusSlice[]; complaint: StatusSlice[]; appointment: StatusSlice[] };
  rates: { name: string; value: number }[];
  funnel: FunnelStage[];
  by_union: UnionRow[] | null;
  by_upazila: UpazilaRow[] | null;
}

export interface ReportFilters { from?: string; to?: string; union_id?: string; ward_no?: string }

export function getReport(f: ReportFilters = {}) {
  const qs = new URLSearchParams();
  if (f.from) qs.set('from', f.from);
  if (f.to) qs.set('to', f.to);
  if (f.union_id) qs.set('union_id', f.union_id);
  if (f.ward_no) qs.set('ward_no', f.ward_no);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<ReportBundle>(`/reports${suffix}`);
}
