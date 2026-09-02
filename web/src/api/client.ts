// Thin fetch wrapper for the Laravel API (SURAHA_BUILD_PROMPT §12). It attaches the Sanctum bearer
// token and resolves the tenant (upazila) from the subdomain, so every request is role- and
// tenant-scoped server-side. The base URL is configurable so the same build serves any subdomain.

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '/api';

const TOKEN_KEY = 'suraha:token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage may be unavailable (private mode) — auth simply won't persist */
  }
};

// Upazila subdomain, e.g. `golachipa` from golachipa.suraha.com.bd. Sent as a hint header; the server
// is still authoritative (it resolves the tenant from the host per stancl/tenancy).
export function currentTenant(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split('.');
  return parts.length > 2 ? parts[0] : null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const tenant = currentTenant();
  if (tenant) headers.set('X-Suraha-Tenant', tenant);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const isJson = res.headers.get('Content-Type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    const msg = (body as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

// True when the failure is a lost connection (queue it) rather than a server rejection (surface it).
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof ApiError && err.status >= 500);
}
