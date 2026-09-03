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
