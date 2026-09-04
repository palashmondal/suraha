import { bn } from './bnNum';

// Short Bangla relative time for the notification bell ("৫ মিনিট আগে", "গতকাল", …).
export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (secs < 60) return 'এইমাত্র';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'গতকাল';
  if (days < 30) return `${bn(days)} দিন আগে`;
  const months = Math.floor(days / 30);
  return `${bn(months)} মাস আগে`;
}

/** Age from a date of birth, always in days — "৪ দিন", "৮০ দিন". Never rolled up to months. */
export function bnAge(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

  return Number.isFinite(days) && days >= 0 ? `${bn(days)} দিন` : '—';
}

// Absolute Bangla date + 12-hour time, e.g. { date: '০৫/০৮/২০২৬', time: 'বিকাল ৩:৪৫' }.
export function formatDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const dd = bn(String(d.getDate()).padStart(2, '0'));
  const mm = bn(String(d.getMonth() + 1).padStart(2, '0'));
  const yyyy = bn(d.getFullYear());

  const h24 = d.getHours();
  const period = h24 < 6 ? 'ভোর' : h24 < 12 ? 'সকাল' : h24 < 16 ? 'দুপুর' : h24 < 19 ? 'বিকাল' : 'রাত';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mins = bn(String(d.getMinutes()).padStart(2, '0'));

  return { date: `${dd}/${mm}/${yyyy}`, time: `${period} ${bn(h12)}:${mins}` };
}
