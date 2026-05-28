import { beforeEach, describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { PriceDropPctEvaluator } from '../../../src/domain/services/PriceDropPctEvaluator';
import { priceAtMin, priceDropPct } from '../../../src/domain/valueObjects/AlertCondition';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeHistory implements PriceHistoryRepository {
  constructor(private snaps: PriceSnapshot[] = []) {}
  async saveSnapshot(): Promise<void> {}
  async getHistory(_url: string, _range: DateRange): Promise<PriceSnapshot[]> { return this.snaps; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(): Promise<Money | null> { return null; }
}

const makeSnap = (amount: number) =>
  new PriceSnapshot('id', 'https://example.com', 'amazon', '', new Money(amount, 'MXN'), new Date());

describe('PriceDropPctEvaluator', () => {
  let evaluator: PriceDropPctEvaluator;

  beforeEach(() => {
    evaluator = new PriceDropPctEvaluator();
  });

  it('returns true when drop equals the required percent', async () => {
    // previous=1000, current=800 → 20% drop
    const history = new FakeHistory([makeSnap(1000), makeSnap(800)]);
    expect(await evaluator.matches(priceDropPct(20, 7), makeSnap(800), history)).toBe(true);
  });

  it('returns true when drop exceeds the required percent', async () => {
    // previous=1000, current=700 → 30% drop, required 20%
    const history = new FakeHistory([makeSnap(1000), makeSnap(700)]);
    expect(await evaluator.matches(priceDropPct(20, 7), makeSnap(700), history)).toBe(true);
  });

  it('returns false when drop is less than the required percent', async () => {
    // previous=1000, current=950 → 5% drop, required 20%
    const history = new FakeHistory([makeSnap(1000), makeSnap(950)]);
    expect(await evaluator.matches(priceDropPct(20, 7), makeSnap(950), history)).toBe(false);
  });

  it('returns false with fewer than 2 historical snapshots', async () => {
    const history = new FakeHistory([makeSnap(1000)]);
    expect(await evaluator.matches(priceDropPct(10, 7), makeSnap(800), history)).toBe(false);
  });

  it('returns false with empty history', async () => {
    const history = new FakeHistory([]);
    expect(await evaluator.matches(priceDropPct(10, 7), makeSnap(800), history)).toBe(false);
  });

  it('returns false for a different condition kind', async () => {
    const history = new FakeHistory([makeSnap(1000), makeSnap(500)]);
    expect(await evaluator.matches(priceAtMin(7), makeSnap(500), history)).toBe(false);
  });

  it('exposes kind PriceDropPct', () => {
    expect(evaluator.kind).toBe('PriceDropPct');
  });
});
