import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from './api';
import { getSelectedUpazila, setSelectedUpazila, clearSelectedUpazila, type SelectedUpazila } from './tenant';

interface AuthUser {
  id: number;
  name: string;
  role: string;
  role_label_bn: string;
}

interface Session {
  booting: boolean;
  upazila: SelectedUpazila | null;
  user: AuthUser | null;
  chooseUpazila: (u: SelectedUpazila) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeUpazila: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [upazila, setUpazila] = useState<SelectedUpazila | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getSelectedUpazila();
      setUpazila(u);
      if (u && (await tokenStore.get())) {
        try {
          const me = await api<{ data: AuthUser }>('/auth/me');
          setUser(me.data);
        } catch {
          await tokenStore.clear();
        }
      }
      setBooting(false);
    })();
  }, []);

  const chooseUpazila = async (u: SelectedUpazila) => {
    await setSelectedUpazila(u);
    setUpazila(u);
  };

  const login = async (username: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>('/auth/officer/login', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
    await tokenStore.set(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* offline logout is fine */
    }
    await tokenStore.clear();
    setUser(null);
  };

  const changeUpazila = async () => {
    await logout();
    await clearSelectedUpazila();
    setUpazila(null);
  };

  return (
    <Ctx.Provider value={{ booting, upazila, user, chooseUpazila, login, logout, changeUpazila }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): Session {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
