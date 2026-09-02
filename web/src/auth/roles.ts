// Roles & RBAC scopes (SURAHA_BUILD_PROMPT §3). Every route/action is authorized by role AND tenant
// scope server-side; the client mirrors that only to route users to the right area and hide UI they
// cannot use. The server stays authoritative.

export type Role =
  | 'fwa' // পরিবার কল্যাণ সহকারী — offline field capture
  | 'sochib' // ইউপি সচিব — review/approve, BDRIS
  | 'uno' // উপজেলা নির্বাহী কর্মকর্তা — appointments + complaints + notices
  | 'investigator' // তদন্ত কর্মকর্তা — assigned complaints, findings
  | 'dc' // জেলা প্রশাসক — read-only district oversight
  | 'seal' // সুরাহা অ্যাডমিন — all upazilas
  | 'citizen'; // নাগরিক — public area

export const OFFICER_ROLES: Role[] = ['fwa', 'sochib', 'uno', 'investigator', 'dc', 'seal'];

export const isOfficer = (role: Role): boolean => role !== 'citizen';
export const isCitizen = (role: Role): boolean => role === 'citizen';
export const isReadOnly = (role: Role): boolean => role === 'dc'; // DC takes no actions

export type SessionUser = {
  id: string;
  role: Role;
  name: string;
  designation: string; // Bangla designation shown in the top bar / profile
  upazila?: string; // home upazila (officers/citizens); DC/SEAL switch across many
  mobile?: string; // citizens
};

// Bangla label per role, for the login role picker and profile chip.
export const ROLE_LABEL: Record<Role, string> = {
  fwa: 'পরিবার কল্যাণ সহকারী',
  sochib: 'ইউপি সচিব',
  uno: 'উপজেলা নির্বাহী কর্মকর্তা',
  investigator: 'তদন্ত কর্মকর্তা',
  dc: 'জেলা প্রশাসক',
  seal: 'সুরাহা অ্যাডমিন',
  citizen: 'নাগরিক',
};

// Where a role lands after login. Citizens get the mobile-first area; everyone else the dashboard.
export function homePathFor(role: Role): string {
  return role === 'citizen' ? '/citizen' : '/app';
}
