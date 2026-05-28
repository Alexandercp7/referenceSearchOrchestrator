import { beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../../../src/domain/entities/Product';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { WatchlistItem } from '../../../src/domain/entities/WatchlistItem';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../../../src/domain/interfaces/repositories/WatchlistRepository';
import { Normalizer } from '../../../src/domain/interfaces/services/Normalizer';
import { StoreProductLookup } from '../../../src/domain/interfaces/stores/StoreProductLookup';
import { PriceRefresh } from '../../../src/domain/usecases/PriceRefresh';
import { RawProduct } from '../../../src/domain/dtos/search/RawProduct';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeWatchlist implements WatchlistRepository {
  constructor(private items: WatchlistItem[]) {}
  async findById(): Promise<WatchlistItem | null> { return null; }
  async findByUser(): Promise<WatchlistItem[]> { return []; }
  async findAll(): Promise<WatchlistItem[]> { return this.items; }
  async exists(): Promise<boolean> { return false; }
  async save(): Promise<void> {}
  async remove(): Promise<void> {}
}

class FakeHistory implements PriceHistoryRepository {
  readonly saved: PriceSnapshot[] = [];
  async saveSnapshot(s: PriceSnapshot): Promise<void> { this.saved.push(s); }
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

const rawProduct: RawProduct = {
  title: 'Monitor',
  priceText: '800',
  currency: 'MXN',
  store: 'amazon',
  url: 'https://example.com',
  inStockText: 'En stock',
  deliveryText: '2 días',
  msiText: '',
};

class FakeNormalizer implements Normalizer {
  normalize(_raw: RawProduct): Product {
    return new Product('p1', 'Monitor', new Money(800, 'MXN'), 'amazon', 'https://example.com', true, 2);
  }
}

class FakeStore implements StoreProductLookup {
  readonly name = 'amazon';
  constructor(private product: RawProduct | null) {}
  async fetchOne(): Promise<RawProduct | null> { return this.product; }
}

const item = new WatchlistItem('i1', 'user-1', 'https://example.com', 'amazon', 'Monitor', new Date());

describe('PriceRefresh', () => {
  let history: FakeHistory;

  beforeEach(() => {
    history = new FakeHistory();
  });

  it('saves a new snapshot for each watchlist item', async () => {
    const useCase = new PriceRefresh(
      new FakeWatchlist([item]),
      history,
      new Map([['amazon', new FakeStore(rawProduct)]]),
      new FakeNormalizer(),
    );
    await useCase.refresh();
    expect(history.saved).toHaveLength(1);
    expect(history.saved[0]?.price.amount.toNumber()).toBe(800);
  });

  it('skips item when store is not registered', async () => {
    const useCase = new PriceRefresh(
      new FakeWatchlist([item]),
      history,
      new Map(),
      new FakeNormalizer(),
    );
    await useCase.refresh();
    expect(history.saved).toHaveLength(0);
  });

  it('skips item when store returns null', async () => {
    const useCase = new PriceRefresh(
      new FakeWatchlist([item]),
      history,
      new Map([['amazon', new FakeStore(null)]]),
      new FakeNormalizer(),
    );
    await useCase.refresh();
    expect(history.saved).toHaveLength(0);
  });

  it('continues refreshing other items when one throws', async () => {
    const item2 = new WatchlistItem('i2', 'user-1', 'https://other.com', 'amazon', 'TV', new Date());
    let callCount = 0;
    const faultyStore: StoreProductLookup = {
      name: 'amazon',
      async fetchOne() {
        callCount++;
        if (callCount === 1) throw new Error('scraper error');
        return rawProduct;
      },
    };
    const useCase = new PriceRefresh(
      new FakeWatchlist([item, item2]),
      history,
      new Map([['amazon', faultyStore]]),
      new FakeNormalizer(),
    );
    await expect(useCase.refresh()).resolves.not.toThrow();
    expect(history.saved).toHaveLength(1);
  });
});
