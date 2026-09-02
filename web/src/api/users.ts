import { api } from './client';
import type { Officer } from './officers';

/** A directory row is the same shape as an officer — citizens simply have no username. */
export type DirectoryUser = Officer;

export function listUsers(params: { role?: string; q?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.role) qs.set('role', params.role);
  if (params.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';

  return api<{ data: DirectoryUser[] }>(`/users${suffix}`);
}
