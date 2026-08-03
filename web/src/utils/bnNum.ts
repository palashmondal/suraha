// Bangla numeral conversion — the UI shows Bangla digits (SURAHA_BUILD_PROMPT §1.1(5)).
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}
