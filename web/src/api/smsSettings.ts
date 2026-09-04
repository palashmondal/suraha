import { api } from './client';

// SMS সেটিংস — the provider account behind every OTP and decision message.

export interface SmsUsagePoint {
  date: string;
  total: number;
  sent: number;
  failed: number;
  parts: number;
}

export interface SmsSettings {
  gateway: string;
  provider: { name: string; url: string; panel_url: string; recharge_url: string };
  /** Never the key itself — enough to tell which one is configured. */
  api_key_masked: string | null;
  sender_id: string | null;
  /** Prefills the test box, so a tester can send it as-is or edit it. */
  default_test_message: string;
  /** null when the provider could not be reached — "unavailable", not "zero". */
  balance: { balance: number; validity: string | null } | null;
  usage: {
    days: number;
    series: SmsUsagePoint[];
    total: number;
    sent: number;
    failed: number;
    parts: number;
    by_purpose: { purpose: string; label: string; total: number; parts: number }[];
    /** Who spent the credit. SEAL sees every upazila; a UNO sees only their own. */
    by_tenant: {
      tenant_id: string | null;
      name: string;
      subdomain: string;
      total: number;
      parts: number;
      sent: number;
      failed: number;
    }[];
    recent_failures: { phone: string; error: string; at: string | null }[];
  };
}

export const getSmsSettings = () => api<SmsSettings>('/sms-settings');

export const saveSmsSettings = (body: { api_key?: string; sender_id?: string }) =>
  api<SmsSettings>('/sms-settings', { method: 'PUT', body });

export interface SmsTestResult {
  sent: boolean;
  error: string | null;
  /** What was actually sent, and what it cost in billable parts. */
  message: string;
  parts: number;
  /** What the handset will show as the sender — null when no masking is configured. */
  sender_id: string | null;
  settings: SmsSettings;
}

// Sends a real message and spends real credit.
export const sendTestSms = (phone: string, message?: string) =>
  api<SmsTestResult>('/sms-settings/test', { method: 'POST', body: { phone, message } });
