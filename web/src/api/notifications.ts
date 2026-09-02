import { api } from './client';

export interface AppNotification {
  id: number;
  module: 'pregnancy' | 'birth' | 'complaint' | 'appointment' | 'assistance' | 'suggestion';
  title: string;
  detail: string | null;
  link: string | null;
  created_at: string | null;
  unread: boolean;
}

export const getNotifications = () =>
  api<{ unread_count: number; notifications: AppNotification[] }>('/notifications');

// Full list for the "সকল নোটিফিকেশন" page.
export const getAllNotifications = () =>
  api<{ unread_count: number; notifications: AppNotification[] }>('/notifications?all=1');

export const markAllNotificationsRead = () =>
  api('/notifications/read-all', { method: 'POST' });

export const markNotificationRead = (id: number) =>
  api(`/notifications/${id}/read`, { method: 'POST' });
