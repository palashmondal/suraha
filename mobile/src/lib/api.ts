import { Preferences } from '@capacitor/preferences';
import { apiBaseFor, CENTRAL_BASE, getSelectedUpazila } from './tenant';

// NOTE: the token lives in Capacitor Preferences for v1. Harden to a Keystore-backed secure
// storage plugin before production (see FWA_MOBILE_APP_PLAN §7).
const TOKEN_KEY = 'suraha_token';

export const tokenStore = {
  get: async () => (await Preferences.get({ key: TOKEN_KEY })).value,
  set: (t: string) => Preferences.set({ key: TOKEN_KEY, value: t }),
  clear: () => Preferences.remove({ key: TOKEN_KEY }),
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Use the central host (first-run directory) instead of the selected upazila's host. */
  central?: boolean;
};

async function baseUrl(central: boolean): Promise<string> {
  if (central) return CENTRAL_BASE + '/api';
  const u = await getSelectedUpazila();
  if (!u) throw new ApiError(0, 'উপজেলা নির্বাচন করা হয়নি।');
  return apiBaseFor(u.slug);
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true, central = false } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${await baseUrl(central)}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { message?: string }).message ?? 'Request failed',
      (data as { errors?: Record<string, string[]> }).errors,
    );
  }
  return data as T;
}
