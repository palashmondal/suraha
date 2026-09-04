import { describe, expect, it } from 'vitest';
import { bnAge } from './timeAgo';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe('bnAge', () => {
  it('always counts in days, however old', () => {
    expect(bnAge(daysAgo(4))).toBe('৪ দিন');
    expect(bnAge(daysAgo(80))).toBe('৮০ দিন');
    expect(bnAge(daysAgo(400))).toBe('৪০০ দিন');
  });

  it('shows a dash for a missing or future date', () => {
    expect(bnAge(null)).toBe('—');
    expect(bnAge(daysAgo(-5))).toBe('—');
  });
});
