import { beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../../../src/domain/entities/Product';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { WatchlistItem } from '../../../src/domain/entities/WatchlistItem';
import { ProductNotFound } from '../../../src/domain/exceptions/SearchErrors';
import { ItemAlreadyTracked, UnknownStore } from '../../../src/domain/exceptions/WatchlistErrors';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../../../src/domain/interfaces/repositories/WatchlistRepository';
import { Normalizer } from '../../../src/domain/interfaces/services/Normalizer';
import { StoreProductLookup } from '../../../src/domain/interfaces/stores/StoreProductLookup';
import { WatchlistAddition } from '../../../src/domain/usecases/WatchlistAddition';
import { RawProduct } from '../../../src/domain/dtos/search/RawProduct';
import { IdGenerator } from '../../../src/domain/interfaces/gateways/IdGenerator';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeIds implements IdGenerator {
  private n = 0;
  generate(): string { return `id-${++this.n}`; }
}

class FakeWatchlist implements WatchlistRepository {
  private items = new Map<string, WatchlistItem>();
  private tracking = new Set<string>();

  async findById(id: string): Promise<WatchlistItem | null> { return this.items.get(id) ?? null; }
  async findByUser(userId: string): Promise<WatchlistItem[]> {
    return [...this.items.values()].filter((i) => i.userId === userId);
  }
  async findAll(): Promise<WatchlistItem[]> { return [...this.items.values()]; }
  async exists(userId: string, productUrl: string): Promise<boolean> {
    return this.tracking.has(`${userId}:${productUrl}`);
  }
  async save(item: WatchlistItem): Promise<void> {
    this.items.set(item.id, item);
    this.tracking.add(`${item.userId}:${item.productUrl}`);
  }
  async remove(id: string): Promise<void> { this.items.delete(id); }
}

class FakeHistory implements PriceHistoryRepository {
  readonly saved: PriceSnapshot[] = [];
  shouldFail = false;
  async saveSnapshot(s: PriceSnapshot): Promise<void> {
    if (this.shouldFail) throw new Error('storage error');
    this.saved.push(s);
  }
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return null; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

const rawProduct: RawProduct = {
  title: 'Test Monitor',
  priceText: '1000',
  currency: 'MXN',
  store: 'amazon',
  url: 'https://example.com/monitor',
  inStockText: 'En stock',
  deliveryText: '3 días',
  msiText: '',
};

class FakeNormalizer implements Normalizer {
  normalize(_raw: RawProduct): Product {
    return new Product('p1', 'Test Monitor', new Money(1000, 'MXN'), 'amazon', 'https://example.com/monitor', true, 3);
  }
}

class FakeStore implements StoreProductLookup {
  readonly name = 'amazon';
  constructor(private product: RawProduct | null) {}
  async fetchOne(): Promise<RawProduct | null> { return this.product; }
}

describe('WatchlistAddition', () => {
  let watchlist: FakeWatchlist;
  let history: FakeHistory;
  let useCase: WatchlistAddition;

  beforeEach(() => {
    watchlist = new FakeWatchlist();
    history = new FakeHistory();
    useCase = new WatchlistAddition(
      watchlist,
      history,
      new Map([['amazon', new FakeStore(rawProduct)]]),
      new FakeNormalizer(),
      new FakeIds(),
    );
  });

  it('adds item and saves initial price snapshot', async () => {
    const item = await useCase.add({
      userId: 'u1',
      productUrl: 'https://example.com/monitor',
      store: 'amazon',
    });
    expect(item.title).toBe('Test Monitor');
    expect(item.store).toBe('amazon');
    expect(history.saved).toHaveLength(1);
    expect(history.saved[0]?.price.amount.toNumber()).toBe(1000);
  });

  it('throws ItemAlreadyTracked when product is already in the watchlist', async () => {
    await useCase.add({ userId: 'u1', productUrl: 'https://example.com/monitor', store: 'amazon' });
    await expect(
      useCase.add({ userId: 'u1', productUrl: 'https://example.com/monitor', store: 'amazon' }),
    ).rejects.toBeInstanceOf(ItemAlreadyTracked);
  });

  it('throws UnknownStore when the store is not registered', async () => {
    await expect(
      useCase.add({ userId: 'u1', productUrl: 'https://example.com/monitor', store: 'unknown' }),
    ).rejects.toBeInstanceOf(UnknownStore);
  });

  it('rolls back watchlist item when snapshot save fails', async () => {
    history.shouldFail = true;
    await expect(
      useCase.add({ userId: 'u1', productUrl: 'https://example.com/monitor', store: 'amazon' }),
    ).rejects.toThrow('storage error');
    expect(await watchlist.findByUser('u1')).toHaveLength(0);
  });

  it('throws ProductNotFound when store returns null', async () => {
    const emptyUseCase = new WatchlistAddition(
      watchlist,
      history,
      new Map([['amazon', new FakeStore(null)]]),
      new FakeNormalizer(),
      new FakeIds(),
    );
    await expect(
      emptyUseCase.add({ userId: 'u1', productUrl: 'https://example.com/monitor', store: 'amazon' }),
    ).rejects.toBeInstanceOf(ProductNotFound);
  });
});
