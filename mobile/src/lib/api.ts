import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { apiBaseFor, CENTRAL_BASE, getSelectedUpazila } from './tenant';

// The bearer token sits in the Android Keystore (SecureStorage), not Preferences — Preferences is
// plain SharedPreferences and this token grants access to a whole upazila's records.
const TOKEN_KEY = 'suraha_token';

export const tokenStore = {
  get: () => SecureStorage.getItem(TOKEN_KEY),
  set: (t: string) => SecureStorage.setItem(TOKEN_KEY, t),
  clear: () => SecureStorage.remove(TOKEN_KEY).then(() => undefined),
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
