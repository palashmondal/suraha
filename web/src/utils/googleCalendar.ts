// A one-off "add this to my Google Calendar" link — a plain URL, no account linking. Used by the
// সাক্ষাৎকার detail page and by অভিযোগ rows whose শুনানি date is fixed.
//
// Times are Asia/Dhaka (+06:00, no DST). Without a time the event is all-day, which is what a
// শুনানি is: the schema stores a date and nothing finer.
export function googleCalendarUrl(e: {
  title: string;
  date: string | null;
  time?: string | null;
  details?: (string | null | undefined)[];
  location?: string | null;
  minutes?: number;
}): string | null {
  if (!e.date) return null;

  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace('.000', '');
  let dates: string;

  if (e.time) {
    const start = new Date(`${e.date}T${e.time.slice(0, 5)}:00+06:00`);
    const end = new Date(start.getTime() + (e.minutes ?? 30) * 60_000);
    dates = `${stamp(start.toISOString().slice(0, 19))}Z/${stamp(end.toISOString().slice(0, 19))}Z`;
  } else {
    const day = e.date.replace(/-/g, '');
    const next = new Date(`${e.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    dates = `${day}/${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
  }

  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: (e.details ?? []).filter(Boolean).join('\n'),
    // Google geocodes this and links it to Maps itself.
    location: e.location ?? '',
    ctz: 'Asia/Dhaka',
  });

  return `https://calendar.google.com/calendar/render?${qs}`;
}
