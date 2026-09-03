import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import { SELECTED_TENANT_KEY, SELECTED_TENANT_LABEL_KEY } from '../tenant/SelectedTenantContext';

// Shape returned by UserResource on the API.
export interface AuthUser {
  id: number;
  name: string;
  name_en: string | null;
  username: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  role_label_bn: string;
  designation: string | null;
  avatar_url: string | null;
  scope: 'global' | 'district' | 'tenant';
  is_read_only: boolean;
  tenant_id: string | null;
  upazila?: { id: string; name: string; name_bn: string };
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  officerLogin: (username: string, password: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<string | null>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount if a token is present.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    // /auth/me returns a UserResource wrapped as { data: {...} } (login/verify return the user
    // flat under `user`), so unwrap .data here.
    api<{ data: AuthUser }>('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const applyToken = async (res: { token: string; user: AuthUser }) => {
    tokenStore.set(res.token);
    // A fresh login starts clean: cross-tenant roles (SEAL/DC) default to the aggregate
    // ("সকল উপজেলা"). An in-session upazila pick still persists across navigation/reload.
    localStorage.removeItem(SELECTED_TENANT_KEY);
    localStorage.removeItem(SELECTED_TENANT_LABEL_KEY);
    setUser(res.user);
  };

  const officerLogin = async (username: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>('/auth/officer/login', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
    await applyToken(res);
  };

  const requestOtp = async (phone: string) => {
    const res = await api<{ dev_code: string | null }>('/auth/citizen/request-otp', {
      method: 'POST',
      auth: false,
      body: { phone },
    });
    return res.dev_code;
  };

  const verifyOtp = async (phone: string, code: string, name?: string) => {
    const res = await api<{ token: string; user: AuthUser }>('/auth/citizen/verify-otp', {
      method: 'POST',
      auth: false,
      body: { phone, code, name },
    });
    await applyToken(res);
  };

  const refresh = async () => {
    const r = await api<{ data: AuthUser }>('/auth/me');
    setUser(r.data);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.clear();
      localStorage.removeItem(SELECTED_TENANT_KEY);
      localStorage.removeItem(SELECTED_TENANT_LABEL_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, officerLogin, requestOtp, verifyOtp, refresh, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
