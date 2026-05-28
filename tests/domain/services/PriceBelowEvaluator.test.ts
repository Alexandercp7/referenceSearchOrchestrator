import { beforeEach, describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { PriceBelowEvaluator } from '../../../src/domain/services/PriceBelowEvaluator';
import { priceAtMin, priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeHistory implements PriceHistoryRepository {
  async saveSnapshot(): Promise<void> {}
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

const snap = (amount: number) =>
  new PriceSnapshot('id', 'https://example.com', 'amazon', new Money(amount, 'MXN'), new Date());

describe('PriceBelowEvaluator', () => {
  let evaluator: PriceBelowEvaluator;
  let history: FakeHistory;

  beforeEach(() => {
    evaluator = new PriceBelowEvaluator();
    history = new FakeHistory();
  });

  it('returns true when price is strictly below threshold', async () => {
    const condition = priceBelow(new Money(600, 'MXN'));
    expect(await evaluator.matches(condition, snap(400), history)).toBe(true);
  });

  it('returns false when price equals the threshold', async () => {
    const condition = priceBelow(new Money(400, 'MXN'));
    expect(await evaluator.matches(condition, snap(400), history)).toBe(false);
  });

  it('returns false when price is above the threshold', async () => {
    const condition = priceBelow(new Money(300, 'MXN'));
    expect(await evaluator.matches(condition, snap(500), history)).toBe(false);
  });

  it('returns false for a different condition kind', async () => {
    const condition = priceAtMin(7);
    expect(await evaluator.matches(condition, snap(100), history)).toBe(false);
  });

  it('exposes kind PriceBelow', () => {
    expect(evaluator.kind).toBe('PriceBelow');
  });
});
