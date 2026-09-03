import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Selected upazila for cross-tenant roles (SEAL/DC) switching in-app on the central host.
// Persisted in localStorage so it survives refresh AND per-navigation remounts of the app shell
// (RequireAuth wraps each route in its own <AppShell>, so TopBar remounts on every navigation).
// The API client reads SELECTED_TENANT_KEY to attach the X-Upazila header (see api/client.ts).
// We also persist the display label so the switcher shows the right upazila instantly on remount
// instead of flashing back to "সকল উপজেলা" while the registry list re-fetches. The URL host never
// changes.
export const SELECTED_TENANT_KEY = 'suraha_selected_upazila';
export const SELECTED_TENANT_LABEL_KEY = 'suraha_selected_upazila_label';

interface SelectedTenantState {
  selectedUpazilaId: string | null;
  // Display label for the selected upazila (null = aggregate / "সকল উপজেলা").
  selectedUpazilaLabel: string | null;
  // Bumped on every change so data consumers (dashboard, top bar) can refetch.
  version: number;
  setSelectedUpazila: (id: string | null, label?: string | null) => void;
}

const SelectedTenantContext = createContext<SelectedTenantState | null>(null);

export function SelectedTenantProvider({ children }: { children: ReactNode }) {
  const [selectedUpazilaId, setId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_TENANT_KEY),
  );
  const [selectedUpazilaLabel, setLabel] = useState<string | null>(
    () => localStorage.getItem(SELECTED_TENANT_LABEL_KEY),
  );
  const [version, setVersion] = useState(0);

  const setSelectedUpazila = useCallback((id: string | null, label: string | null = null) => {
    if (id) localStorage.setItem(SELECTED_TENANT_KEY, id);
    else localStorage.removeItem(SELECTED_TENANT_KEY);
    if (label) localStorage.setItem(SELECTED_TENANT_LABEL_KEY, label);
    else localStorage.removeItem(SELECTED_TENANT_LABEL_KEY);
    setId(id);
    setLabel(label);
    setVersion((v) => v + 1);
  }, []);

  return (
    <SelectedTenantContext.Provider
      value={{ selectedUpazilaId, selectedUpazilaLabel, version, setSelectedUpazila }}
    >
      {children}
    </SelectedTenantContext.Provider>
  );
}

export function useSelectedTenant(): SelectedTenantState {
  const ctx = useContext(SelectedTenantContext);
  if (!ctx) throw new Error('useSelectedTenant must be used within SelectedTenantProvider');
  return ctx;
}
