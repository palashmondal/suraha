import { api } from './client';
import { setOfficerActive, type Officer } from './officers';

// Investigating officers (তদন্ত কর্মকর্তা) — the pool UNO/SEAL add and then assign to complaints.
// Accounts are keyed by mobile number (username = mobile); the API returns a one-time temp password.

export interface NewInvestigatorCreds {
  username: string;
  temp_password: string;
}

export const listInvestigatingOfficers = () =>
  api<{ data: Officer[] }>('/investigating-officers');

export const createInvestigatingOfficer = (body: {
  name: string;
  designation?: string;
  email?: string;
  phone: string;
}) =>
  api<{ data: Officer; credentials: NewInvestigatorCreds }>('/investigating-officers', {
    method: 'POST',
    body,
  });

// Toggling active status reuses the shared officer endpoint.
export const setInvestigatorActive = setOfficerActive;
