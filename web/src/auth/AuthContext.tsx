import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, setToken, ApiError } from '../api/client';
import { ROLE_LABEL, type Role, type SessionUser } from './roles';

// Auth state for the whole PWA. Officers authenticate with credentials; citizens with mobile + OTP
// (SURAHA_BUILD_PROMPT §1.1(3)). The API is the real backend (Sanctum tokens); until Milestone 2 is
// wired, VITE_API_URL may be unset — in that case we fall back to a local mock session so the client
// is demonstrable. The mock path is clearly gated on the missing backend, never used in production.

const USER_KEY = 'suraha:user';
const HAS_BACKEND = Boolean(import.meta.env.VITE_API_URL);

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  officerLogin: (username: string, password: string, demoRole?: Role) => Promise<SessionUser>;
  requestOtp: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, code: string) => Promise<SessionUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

function readStoredUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: SessionUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* private mode — session just won't persist */
  }
}

// Demo sessions used only when no backend is configured (pre-Milestone-2), so reviewers can walk
// every role's experience. Names mirror the sample data already in the dashboard.
const DEMO_USERS: Record<Role, SessionUser> = {
  fwa: { id: 'demo-fwa', role: 'fwa', name: 'রেহানা পারভীন', designation: ROLE_LABEL.fwa, upazila: 'গলাচিপা উপজেলা, বরিশাল' },
  sochib: { id: 'demo-sochib', role: 'sochib', name: 'আব্দুল করিম', designation: ROLE_LABEL.sochib, upazila: 'গলাচিপা উপজেলা, বরিশাল' },
  uno: { id: 'demo-uno', role: 'uno', name: 'মহিউদ্দিন আল হেলাল', designation: 'উপজেলা নির্বাহী অফিসার, গলাচিপা', upazila: 'গলাচিপা উপজেলা, বরিশাল' },
  investigator: { id: 'demo-inv', role: 'investigator', name: 'সাইফুল ইসলাম', designation: ROLE_LABEL.investigator, upazila: 'গলাচিপা উপজেলা, বরিশাল' },
  dc: { id: 'demo-dc', role: 'dc', name: 'ফারহানা আক্তার', designation: 'জেলা প্রশাসক, বরিশাল', upazila: 'বরিশাল জেলা' },
  seal: { id: 'demo-seal', role: 'seal', name: 'সুরাহা অ্যাডমিন', designation: ROLE_LABEL.seal },
  citizen: { id: 'demo-citizen', role: 'citizen', name: 'আবিদুর রহমান', designation: ROLE_LABEL.citizen, upazila: 'গলাচিপা উপজেলা, বরিশাল', mobile: '01700000000' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(false);

  const setSession = useCallback((u: SessionUser | null, token?: string | null) => {
    if (token !== undefined) setToken(token);
    persistUser(u);
    setUser(u);
  }, []);

  const officerLogin = useCallback(
    async (username: string, password: string, demoRole: Role = 'uno') => {
      setLoading(true);
      try {
        if (!HAS_BACKEND) {
          const u = DEMO_USERS[demoRole] ?? DEMO_USERS.uno;
          setSession(u, `demo-token-${u.role}`);
          return u;
        }
        const res = await apiFetch<{ token: string; user: SessionUser }>('/auth/officer/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        setSession(res.user, res.token);
        return res.user;
      } finally {
        setLoading(false);
      }
    },
    [setSession],
  );

  const requestOtp = useCallback(async (mobile: string) => {
    if (!HAS_BACKEND) return; // demo: any 6-digit code is accepted by verifyOtp
    await apiFetch('/auth/citizen/otp', { method: 'POST', body: JSON.stringify({ mobile }) });
  }, []);

  const verifyOtp = useCallback(
    async (mobile: string, code: string) => {
      setLoading(true);
      try {
        if (!HAS_BACKEND) {
          if (!/^\d{6}$/.test(code)) throw new ApiError(422, 'ছয় সংখ্যার কোড দিন');
          const u = { ...DEMO_USERS.citizen, mobile };
          setSession(u, 'demo-token-citizen');
          return u;
        }
        const res = await apiFetch<{ token: string; user: SessionUser }>('/auth/citizen/verify', {
          method: 'POST',
          body: JSON.stringify({ mobile, code }),
        });
        setSession(res.user, res.token);
        return res.user;
      } finally {
        setLoading(false);
      }
    },
    [setSession],
  );

  const logout = useCallback(() => {
    if (HAS_BACKEND) void apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setSession(null, null);
  }, [setSession]);

  // Keep multiple tabs in sync (login/logout in one reflects in others).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_KEY) setUser(readStoredUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, officerLogin, requestOtp, verifyOtp, logout }),
    [user, loading, officerLogin, requestOtp, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { HAS_BACKEND };
