import { describe, expect, it } from 'vitest';
import { InvalidMoney, Money } from '../../../src/domain/valueObjects/Money';

describe('Money', () => {
  it('builds with valid amount and currency', () => {
    const m = new Money(100, 'mxn');
    expect(m.amount.toNumber()).toBe(100);
    expect(m.currency).toBe('MXN');
  });

  it('rejects negative amounts', () => {
    expect(() => new Money(-1, 'MXN')).toThrow(InvalidMoney);
  });

  it('rejects invalid currency code', () => {
    expect(() => new Money(100, 'PESOS')).toThrow(InvalidMoney);
  });

  it('adds money of the same currency', () => {
    const sum = new Money(10, 'MXN').add(new Money(5, 'MXN'));
    expect(sum.amount.toNumber()).toBe(15);
  });

  it('fails when adding different currencies', () => {
    expect(() => new Money(10, 'MXN').add(new Money(5, 'USD'))).toThrow(InvalidMoney);
  });

  it('computes percent drop correctly', () => {
    const current = new Money(80, 'MXN');
    const previous = new Money(100, 'MXN');
    expect(current.percentDropFrom(previous)).toBe(20);
  });
});
