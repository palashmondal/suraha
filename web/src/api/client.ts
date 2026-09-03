// Thin fetch wrapper for the Suraha API (Milestone 2 — Bearer-token auth).
//
// The API base defaults to the SAME host as the SPA on port 8000, so the upazila subdomain
// (e.g. galachipa.lvh.me) carries through to the API and tenancy resolves automatically in
// dev. Override with VITE_API_BASE for other setups.
const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  `${window.location.protocol}//${window.location.hostname}:8000/api`;

const TOKEN_KEY = 'suraha_token';
// Kept in sync with SelectedTenantContext (SELECTED_TENANT_KEY); read here so the plain fetch
// helper stays hook-free.
const SELECTED_TENANT_KEY = 'suraha_selected_upazila';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
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
};

/**
 * Fetch a file (e.g. a generated certificate) with the same auth/tenant headers and trigger a
 * browser download. The API client is otherwise JSON-only.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const selected = localStorage.getItem(SELECTED_TENANT_KEY);
  if (selected) headers['X-Upazila'] = selected;

  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, 'Download failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const token = tokenStore.get();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  // Cross-tenant roles (SEAL/DC) on the central host switch upazila via this header. Ignored by
  // the API when the request already resolved a tenant from a subdomain.
  const selectedUpazila = localStorage.getItem(SELECTED_TENANT_KEY);
  if (auth && selectedUpazila) headers['X-Upazila'] = selectedUpazila;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // A dead session should end the session. Without this every caller swallows its own 401 into
  // an empty list, so the app still looks signed in while each page mount sprays failures at the
  // console — which is what an expired or revoked token (or a rebuilt database) looks like.
  if (res.status === 401 && auth) {
    tokenStore.clear();
    localStorage.removeItem(SELECTED_TENANT_KEY);

    if (! window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }

    throw new ApiError(401, 'সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।');
  }

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
