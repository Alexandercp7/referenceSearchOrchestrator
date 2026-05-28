import { describe, expect, it } from 'vitest';
import { InvalidAlertCondition } from '../../../src/domain/exceptions/AlertErrors';
import {
  priceAtMin,
  priceBelow,
  priceDropPct,
} from '../../../src/domain/valueObjects/AlertCondition';
import { Money } from '../../../src/domain/valueObjects/Money';

describe('AlertCondition', () => {
  describe('priceBelow', () => {
    it('returns a PriceBelow condition with the threshold', () => {
      const threshold = new Money(500, 'MXN');
      const condition = priceBelow(threshold);
      expect(condition.kind).toBe('PriceBelow');
      if (condition.kind === 'PriceBelow') {
        expect(condition.threshold).toBe(threshold);
      }
    });
  });

  describe('priceAtMin', () => {
    it('returns a PriceAtMin condition with valid lookbackDays', () => {
      const condition = priceAtMin(30);
      expect(condition.kind).toBe('PriceAtMin');
      if (condition.kind === 'PriceAtMin') {
        expect(condition.lookbackDays).toBe(30);
      }
    });

    it('accepts lookbackDays of 1', () => {
      expect(() => priceAtMin(1)).not.toThrow();
    });

    it('rejects lookbackDays of 0', () => {
      expect(() => priceAtMin(0)).toThrow(InvalidAlertCondition);
    });

    it('rejects negative lookbackDays', () => {
      expect(() => priceAtMin(-1)).toThrow(InvalidAlertCondition);
    });

    it('rejects non-integer lookbackDays', () => {
      expect(() => priceAtMin(1.5)).toThrow(InvalidAlertCondition);
    });
  });

  describe('priceDropPct', () => {
    it('returns a PriceDropPct condition with valid parameters', () => {
      const condition = priceDropPct(10, 7);
      expect(condition.kind).toBe('PriceDropPct');
      if (condition.kind === 'PriceDropPct') {
        expect(condition.percent).toBe(10);
        expect(condition.lookbackDays).toBe(7);
      }
    });

    it('accepts percent of exactly 100', () => {
      expect(() => priceDropPct(100, 7)).not.toThrow();
    });

    it('rejects percent of 0', () => {
      expect(() => priceDropPct(0, 7)).toThrow(InvalidAlertCondition);
    });

    it('rejects negative percent', () => {
      expect(() => priceDropPct(-5, 7)).toThrow(InvalidAlertCondition);
    });

    it('rejects percent greater than 100', () => {
      expect(() => priceDropPct(101, 7)).toThrow(InvalidAlertCondition);
    });

    it('rejects NaN percent', () => {
      expect(() => priceDropPct(NaN, 7)).toThrow(InvalidAlertCondition);
    });

    it('rejects lookbackDays of 0', () => {
      expect(() => priceDropPct(10, 0)).toThrow(InvalidAlertCondition);
    });

    it('rejects non-integer lookbackDays', () => {
      expect(() => priceDropPct(10, 2.5)).toThrow(InvalidAlertCondition);
    });
  });
});
