import { api } from './client';

// Which kind of host the SPA is being served from, resolved server-side from the subdomain
// (the front end must NOT guess district-vs-upazila from the hostname string). A 'district'
// kind is a deferred TODO on the backend — see the platform plan.
export type HostKind = 'central' | 'upazila';

export interface HostContext {
  kind: HostKind;
  slug: string | null;
  name_bn: string | null;
  district_bn?: string | null;
  /** False when SEAL has deactivated the instance — the subdomain then serves only a notice. */
  is_active?: boolean;
}

export function getHostContext(): Promise<HostContext> {
  return api<HostContext>('/registry/host-context', { auth: false });
}
