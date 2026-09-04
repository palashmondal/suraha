import { api } from './client';

// Which kind of host the SPA is being served from, resolved server-side from the subdomain
// (the front end must NOT guess district-vs-upazila from the hostname string):
//   central  → suraha.net, the public site + SEAL console
//   district → patuakhali.suraha.net, the DC's read-only dashboard
//   upazila  → galachipa.suraha.net, a tenant
export type HostKind = 'central' | 'district' | 'upazila';

export interface HostContext {
  kind: HostKind;
  /**
   * Central hosts only: true on admin.suraha.net, false on the bare suraha.net. Both are
   * `kind: 'central'` — everything that scopes by host (upazila switcher, union options, login
   * copy) treats them the same. This decides one thing: whether "/" serves the console or the
   * product's landing page.
   */
  is_admin?: boolean;
  slug: string | null;
  name_bn: string | null;
  district_bn?: string | null;
  /** False when SEAL has deactivated the instance — the subdomain then serves only a notice. */
  is_active?: boolean;
  /** Districts only: how many upazilas the DC dashboard aggregates over. */
  upazila_count?: number;
}

export function getHostContext(): Promise<HostContext> {
  return api<HostContext>('/registry/host-context', { auth: false });
}

// An upazila the signed-in user may act on — every provisioned (active) subdomain for SEAL, the
// DC's own district for a DC. Same list the top-bar switcher offers.
export interface SwitchableUpazila {
  id: string;
  name: string;
  name_bn: string;
  district: string | null;
  district_id: number | null;
}

export const listSwitchableUpazilas = () =>
  api<{ upazilas: SwitchableUpazila[] }>('/registry/switchable-upazilas');

// Unions of one named upazila — the console needs them for an upazila it has not switched into.
export const listUnionsOf = (upazilaId: string) =>
  api<{ unions: { id: number; name_bn: string }[] }>(`/registry/unions?upazila=${encodeURIComponent(upazilaId)}`);
