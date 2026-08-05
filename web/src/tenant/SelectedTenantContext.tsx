import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Selected upazila for cross-tenant roles (SEAL/DC) switching in-app on the admin host.
// Persisted in localStorage so it survives refresh; the API client reads the same key to attach
// the X-Upazila header (see api/client.ts). The URL host never changes.
export const SELECTED_TENANT_KEY = 'suraha_selected_upazila';

interface SelectedTenantState {
  selectedUpazilaId: string | null;
  // Bumped on every change so data consumers (dashboard, top bar) can refetch.
  version: number;
  setSelectedUpazila: (id: string | null) => void;
}

const SelectedTenantContext = createContext<SelectedTenantState | null>(null);

export function SelectedTenantProvider({ children }: { children: ReactNode }) {
  const [selectedUpazilaId, setId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_TENANT_KEY),
  );
  const [version, setVersion] = useState(0);

  const setSelectedUpazila = useCallback((id: string | null) => {
    if (id) localStorage.setItem(SELECTED_TENANT_KEY, id);
    else localStorage.removeItem(SELECTED_TENANT_KEY);
    setId(id);
    setVersion((v) => v + 1);
  }, []);

  return (
    <SelectedTenantContext.Provider value={{ selectedUpazilaId, version, setSelectedUpazila }}>
      {children}
    </SelectedTenantContext.Provider>
  );
}

export function useSelectedTenant(): SelectedTenantState {
  const ctx = useContext(SelectedTenantContext);
  if (!ctx) throw new Error('useSelectedTenant must be used within SelectedTenantProvider');
  return ctx;
}
