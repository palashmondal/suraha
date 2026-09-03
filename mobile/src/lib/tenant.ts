import { Preferences } from '@capacitor/preferences';

// The app has no subdomain of its own, so on first run the FWA picks their upazila and we pin the
// API base to that upazila's subdomain — then the Laravel backend resolves tenancy exactly as it
// does for the web app, with no server changes. Persisted so it survives restarts.

const SLUG_KEY = 'suraha_upazila_slug';
const NAME_KEY = 'suraha_upazila_name';

// Central host used only for the first-run upazila directory (before a upazila is chosen).
// Override with VITE_CENTRAL_BASE for local dev (e.g. https://suraha.net or http://lvh.me:8000).
export const CENTRAL_BASE: string =
  (import.meta.env.VITE_CENTRAL_BASE as string | undefined) ?? 'https://suraha.net';

// Template for a upazila's API host. {slug} → the chosen upazila. Override for local dev, e.g.
// VITE_UPAZILA_BASE_TEMPLATE=http://{slug}.lvh.me:8000
const BASE_TEMPLATE: string =
  (import.meta.env.VITE_UPAZILA_BASE_TEMPLATE as string | undefined) ?? 'https://{slug}.suraha.net';

export interface SelectedUpazila {
  slug: string;
  name_bn: string;
}

export function apiBaseFor(slug: string): string {
  return BASE_TEMPLATE.replace('{slug}', slug) + '/api';
}

export async function getSelectedUpazila(): Promise<SelectedUpazila | null> {
  const slug = (await Preferences.get({ key: SLUG_KEY })).value;
  const name = (await Preferences.get({ key: NAME_KEY })).value;
  return slug ? { slug, name_bn: name ?? slug } : null;
}

export async function setSelectedUpazila(u: SelectedUpazila): Promise<void> {
  await Preferences.set({ key: SLUG_KEY, value: u.slug });
  await Preferences.set({ key: NAME_KEY, value: u.name_bn });
}

export async function clearSelectedUpazila(): Promise<void> {
  await Preferences.remove({ key: SLUG_KEY });
  await Preferences.remove({ key: NAME_KEY });
}
