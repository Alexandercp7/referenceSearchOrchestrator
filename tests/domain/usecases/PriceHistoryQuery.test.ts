import { describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { PriceHistoryQuery } from '../../../src/domain/usecases/PriceHistoryQuery';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeHistory implements PriceHistoryRepository {
  constructor(private snaps: PriceSnapshot[]) {}
  async saveSnapshot(): Promise<void> {}
  async getHistory(): Promise<PriceSnapshot[]> { return this.snaps; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

describe('PriceHistoryQuery', () => {
  const range = new DateRange(new Date('2024-01-01'), new Date('2024-01-31'));
  const scrapedAt = new Date('2024-01-15');
  const price = new Money(500, 'MXN');
  const snap = new PriceSnapshot('s1', 'https://example.com', 'amazon', '', price, scrapedAt);

  it('maps snapshots to PricePoints with timestamp and price', async () => {
    const useCase = new PriceHistoryQuery(new FakeHistory([snap]));
    const points = await useCase.query({ productUrl: 'https://example.com', range });

    expect(points).toHaveLength(1);
    expect(points[0]?.timestamp).toEqual(scrapedAt);
    expect(points[0]?.price).toBe(price);
  });

  it('returns empty array when no snapshots exist', async () => {
    const useCase = new PriceHistoryQuery(new FakeHistory([]));
    const points = await useCase.query({ productUrl: 'https://example.com', range });
    expect(points).toHaveLength(0);
  });

  it('preserves the order of snapshots', async () => {
    const s1 = new PriceSnapshot('s1', 'https://example.com', 'amazon', '', new Money(500, 'MXN'), new Date('2024-01-10'));
    const s2 = new PriceSnapshot('s2', 'https://example.com', 'amazon', '', new Money(480, 'MXN'), new Date('2024-01-20'));
    const useCase = new PriceHistoryQuery(new FakeHistory([s1, s2]));
    const points = await useCase.query({ productUrl: 'https://example.com', range });

    expect(points[0]?.price.amount.toNumber()).toBe(500);
    expect(points[1]?.price.amount.toNumber()).toBe(480);
  });
});
