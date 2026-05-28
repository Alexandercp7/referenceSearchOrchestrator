import { beforeEach, describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { PriceAtMinEvaluator } from '../../../src/domain/services/PriceAtMinEvaluator';
import { priceAtMin, priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeHistory implements PriceHistoryRepository {
  constructor(private minPrice: Money | null = null) {}
  async saveSnapshot(): Promise<void> {}
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return this.minPrice; }
}

const snap = (amount: number) =>
  new PriceSnapshot('id', 'https://example.com', 'amazon', new Money(amount, 'MXN'), new Date());

describe('PriceAtMinEvaluator', () => {
  let evaluator: PriceAtMinEvaluator;

  beforeEach(() => {
    evaluator = new PriceAtMinEvaluator();
  });

  it('returns true when snapshot price equals the historical minimum', async () => {
    const history = new FakeHistory(new Money(400, 'MXN'));
    expect(await evaluator.matches(priceAtMin(30), snap(400), history)).toBe(true);
  });

  it('returns false when snapshot price is above the historical minimum', async () => {
    const history = new FakeHistory(new Money(300, 'MXN'));
    expect(await evaluator.matches(priceAtMin(30), snap(400), history)).toBe(false);
  });

  it('returns false when no historical minimum exists', async () => {
    const history = new FakeHistory(null);
    expect(await evaluator.matches(priceAtMin(30), snap(400), history)).toBe(false);
  });

  it('returns false for a different condition kind', async () => {
    const history = new FakeHistory(new Money(400, 'MXN'));
    expect(await evaluator.matches(priceBelow(new Money(500, 'MXN')), snap(400), history)).toBe(false);
  });

  it('exposes kind PriceAtMin', () => {
    expect(evaluator.kind).toBe('PriceAtMin');
  });
});
