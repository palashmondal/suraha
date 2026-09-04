// Bangla numeral conversion — the UI shows Bangla digits (SURAHA_BUILD_PROMPT §1.1(5)).
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * A date as dd/mm/yyyy in Bangla digits.
 *
 * The API sends ISO (YYYY-MM-DD, sometimes with a time), which bn() alone would render as
 * ২০২৬-০৯-১৫ — correct digits, wrong order for a Bangladeshi reader. Anything that is not an ISO
 * date is passed through untouched, so a value already formatted elsewhere is not mangled.
 */
export function bnDate(value?: string | null): string {
  if (!value) return '';

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  return m ? bn(`${m[3]}/${m[2]}/${m[1]}`) : bn(value);
}

// Bengali names the part of the day before the hour; a 24-hour clock reads as foreign here.
// Boundaries are the everyday ones, not astronomical.
const DAY_PARTS: [number, string][] = [
  [4, 'ভোর'],
  [6, 'সকাল'],
  [12, 'দুপুর'],
  [15, 'বিকেল'],
  [18, 'সন্ধ্যা'],
  [20, 'রাত'],
];

/**
 * A clock time the way it is spoken: সকাল ১০:৩০টা, বিকেল ৪টা, রাত ৯:১৫টা.
 *
 * Takes the API's "HH:mm" or "HH:mm:ss"; the minutes are dropped when they are zero, since
 * "বিকেল ৪:০০টা" is not how anyone says four o'clock. Anything else passes through bn() so a
 * value formatted elsewhere is not mangled.
 */
export function bnTime(value?: string | null): string {
  if (!value) return '';

  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return bn(value);

  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return bn(value);

  // Before ভোর the night is still the previous one, so anything under 4 is রাত.
  const part = DAY_PARTS.reduce((acc, [from, label]) => (hour >= from ? label : acc), 'রাত');
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${part} ${bn(hour12)}${minute ? ':' + bn(String(minute).padStart(2, '0')) : ''}টা`;
}
