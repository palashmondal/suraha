import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useHostContext } from './host';
import { useSelectedTenant } from './SelectedTenantContext';

export interface UnionOption {
  value: string;
  label: string;
}

/**
 * The unions of whichever upazila is in scope — the subdomain's, or the one a cross-tenant user
 * picked in the switcher.
 *
 * Unions belong to one upazila, so on the central host with none picked there are none to list
 * and the request can only 400. Every caller was making it anyway and swallowing the failure
 * into an empty list, which is the same answer with a console error attached.
 */
export function useUnionOptions(enabled = true): UnionOption[] {
  const host = useHostContext();
  const { selectedUpazilaId, version } = useSelectedTenant();
  const [unions, setUnions] = useState<UnionOption[]>([]);

  // host === null while the one-time lookup is in flight; wait rather than guess.
  const hasUpazila = host ? host.kind !== 'central' || Boolean(selectedUpazilaId) : false;

  useEffect(() => {
    if (! enabled || ! hasUpazila) {
      setUnions([]);
      return;
    }

    api<{ unions: { id: number; name_bn: string }[] }>('/registry/unions')
      .then((r) => setUnions(r.unions.map((u) => ({ value: String(u.id), label: u.name_bn }))))
      .catch(() => setUnions([]));
  }, [enabled, hasUpazila, version]);

  return unions;
}
