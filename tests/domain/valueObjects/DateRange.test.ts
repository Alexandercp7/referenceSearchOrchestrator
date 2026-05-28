import { describe, expect, it } from 'vitest';
import { InvalidDateRange } from '../../../src/domain/exceptions/DateRangeErrors';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';

describe('DateRange', () => {
  it('builds when from is before to', () => {
    const from = new Date('2024-01-01');
    const to = new Date('2024-01-31');
    const range = new DateRange(from, to);
    expect(range.from).toEqual(from);
    expect(range.to).toEqual(to);
  });

  it('accepts equal from and to (point in time)', () => {
    const date = new Date('2024-06-15');
    expect(() => new DateRange(date, date)).not.toThrow();
  });

  it('rejects when from is after to', () => {
    const from = new Date('2024-02-01');
    const to = new Date('2024-01-01');
    expect(() => new DateRange(from, to)).toThrow(InvalidDateRange);
  });

  it('contains() returns true for date strictly inside range', () => {
    const range = new DateRange(new Date('2024-01-01'), new Date('2024-01-31'));
    expect(range.contains(new Date('2024-01-15'))).toBe(true);
  });

  it('contains() returns true for date on the from boundary', () => {
    const from = new Date('2024-01-01');
    const range = new DateRange(from, new Date('2024-01-31'));
    expect(range.contains(from)).toBe(true);
  });

  it('contains() returns true for date on the to boundary', () => {
    const to = new Date('2024-01-31');
    const range = new DateRange(new Date('2024-01-01'), to);
    expect(range.contains(to)).toBe(true);
  });

  it('contains() returns false for date before range', () => {
    const range = new DateRange(new Date('2024-01-10'), new Date('2024-01-31'));
    expect(range.contains(new Date('2024-01-01'))).toBe(false);
  });

  it('contains() returns false for date after range', () => {
    const range = new DateRange(new Date('2024-01-01'), new Date('2024-01-10'));
    expect(range.contains(new Date('2024-02-01'))).toBe(false);
  });

  it('lastDays() creates a range ending approximately now', () => {
    const before = Date.now();
    const range = DateRange.lastDays(7);
    const after = Date.now();

    expect(range.to.getTime()).toBeGreaterThanOrEqual(before);
    expect(range.to.getTime()).toBeLessThanOrEqual(after);
  });

  it('lastDays() creates a range spanning exactly N days', () => {
    const range = DateRange.lastDays(7);
    const expectedMs = 7 * 24 * 60 * 60 * 1000;
    const actualMs = range.to.getTime() - range.from.getTime();
    expect(actualMs).toBeCloseTo(expectedMs, -3);
  });
});
