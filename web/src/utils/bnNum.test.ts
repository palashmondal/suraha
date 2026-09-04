import { describe, expect, it } from 'vitest';
import { bnTime } from './bnNum';

describe('bnTime', () => {
  it('names the part of the day and drops zero minutes', () => {
    expect(bnTime('10:30')).toBe('সকাল ১০:৩০টা');
    expect(bnTime('16:00')).toBe('বিকেল ৪টা');
    expect(bnTime('16:00:00')).toBe('বিকেল ৪টা'); // API sometimes sends seconds
    expect(bnTime('09:05')).toBe('সকাল ৯:০৫টা');  // minute keeps its leading zero
  });

  it('covers every day part, including the two that wrap around 12', () => {
    expect(bnTime('05:00')).toBe('ভোর ৫টা');
    expect(bnTime('12:00')).toBe('দুপুর ১২টা');
    expect(bnTime('14:45')).toBe('দুপুর ২:৪৫টা');
    expect(bnTime('18:30')).toBe('সন্ধ্যা ৬:৩০টা');
    expect(bnTime('21:00')).toBe('রাত ৯টা');
    expect(bnTime('00:15')).toBe('রাত ১২:১৫টা'); // past midnight is still রাত
    expect(bnTime('03:00')).toBe('রাত ৩টা');
  });

  it('passes through what it cannot read', () => {
    expect(bnTime('')).toBe('');
    expect(bnTime(null)).toBe('');
    expect(bnTime('25:00')).toBe('২৫:০০');
    expect(bnTime('অপরাহ্ন')).toBe('অপরাহ্ন');
  });
});
