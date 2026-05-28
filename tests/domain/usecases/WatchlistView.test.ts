import { beforeEach, describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { WatchlistItem } from '../../../src/domain/entities/WatchlistItem';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../../../src/domain/interfaces/repositories/WatchlistRepository';
import { WatchlistView } from '../../../src/domain/usecases/WatchlistView';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeWatchlist implements WatchlistRepository {
  constructor(private items: WatchlistItem[]) {}
  async findById(): Promise<WatchlistItem | null> { return null; }
  async findByUser(userId: string): Promise<WatchlistItem[]> {
    return this.items.filter((i) => i.userId === userId);
  }
  async findAll(): Promise<WatchlistItem[]> { return this.items; }
  async exists(): Promise<boolean> { return false; }
  async save(): Promise<void> {}
  async remove(): Promise<void> {}
}

class FakeHistory implements PriceHistoryRepository {
  constructor(private latest: PriceSnapshot | null) {}
  async saveSnapshot(): Promise<void> {}
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return this.latest; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

describe('WatchlistView', () => {
  const addedAt = new Date('2024-01-15');
  const item = new WatchlistItem('i1', 'user-1', 'https://example.com', 'amazon', 'Monitor', addedAt);

  it('returns views with currentPrice when history exists', async () => {
    const price = new Money(999, 'MXN');
    const snap = new PriceSnapshot('s1', 'https://example.com', 'amazon', price, new Date());
    const useCase = new WatchlistView(new FakeWatchlist([item]), new FakeHistory(snap));

    const views = await useCase.list('user-1');

    expect(views).toHaveLength(1);
    expect(views[0]?.currentPrice?.equals(price)).toBe(true);
  });

  it('returns null currentPrice when no snapshot exists', async () => {
    const useCase = new WatchlistView(new FakeWatchlist([item]), new FakeHistory(null));
    const views = await useCase.list('user-1');
    expect(views[0]?.currentPrice).toBeNull();
  });

  it('returns empty list when user has no items', async () => {
    const useCase = new WatchlistView(new FakeWatchlist([]), new FakeHistory(null));
    expect(await useCase.list('user-1')).toHaveLength(0);
  });

  it('maps item fields to view correctly', async () => {
    const useCase = new WatchlistView(new FakeWatchlist([item]), new FakeHistory(null));
    const [view] = await useCase.list('user-1');

    expect(view).toMatchObject({
      id: 'i1',
      productUrl: 'https://example.com',
      store: 'amazon',
      title: 'Monitor',
      addedAt,
    });
  });
});
