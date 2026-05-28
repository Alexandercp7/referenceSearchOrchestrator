import { beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../../../src/domain/entities/Product';
import { RawProduct } from '../../../src/domain/dtos/search/RawProduct';
import { RankedProduct } from '../../../src/domain/dtos/search/RankedProduct';
import { SearchResponse } from '../../../src/domain/dtos/search/SearchResponse';
import { AllStoresFailed } from '../../../src/domain/exceptions/SearchErrors';
import { Normalizer } from '../../../src/domain/interfaces/services/Normalizer';
import { RankStrategy } from '../../../src/domain/interfaces/services/RankStrategy';
import { SearchCache } from '../../../src/domain/interfaces/services/SearchCache';
import { StoreProductSearch } from '../../../src/domain/interfaces/stores/StoreProductSearch';
import { ProductSearch } from '../../../src/domain/usecases/ProductSearch';
import { Money } from '../../../src/domain/valueObjects/Money';
import { SearchWeights } from '../../../src/domain/valueObjects/SearchWeights';

const raw = (title: string, store: string): RawProduct => ({
  title,
  priceText: '1000',
  currency: 'MXN',
  store,
  url: `https://${store}.com/${title}`,
  inStockText: 'In stock',
  deliveryText: '3 days',
  msiText: '',
});

class FakeStore implements StoreProductSearch {
  constructor(
    readonly name: string,
    private products: RawProduct[],
  ) {}
  async search(): Promise<RawProduct[]> { return this.products; }
}

class FailingStore implements StoreProductSearch {
  readonly name = 'failing';
  async search(): Promise<RawProduct[]> { throw new Error('store unavailable'); }
}

class FakeNormalizer implements Normalizer {
  normalize(r: RawProduct): Product {
    return new Product('id', r.title, new Money(1000, 'MXN'), r.store, r.url, true, 3);
  }
}

class FakeRanker implements RankStrategy {
  rank(products: Product[], _weights: SearchWeights): RankedProduct[] {
    return products.map(
      (p, i) => new RankedProduct(p.id, p.title, p.store, p.url, p.price, Math.max(0, 1 - i * 0.1)),
    );
  }
}

class FakeCache implements SearchCache {
  private store = new Map<string, SearchResponse>();
  async get(key: string): Promise<SearchResponse | null> { return this.store.get(key) ?? null; }
  async set(key: string, response: SearchResponse): Promise<void> { this.store.set(key, response); }
}

describe('ProductSearch', () => {
  const weights = SearchWeights.balanced();

  it('returns ranked products from a store', async () => {
    const useCase = new ProductSearch(
      [new FakeStore('amazon', [raw('Monitor A', 'amazon'), raw('Monitor B', 'amazon')])],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    const response = await useCase.search({ query: 'monitor', weights });
    expect(response.fromCache).toBe(false);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.query).toBe('monitor');
  });

  it('returns results from cache on second call', async () => {
    const useCase = new ProductSearch(
      [new FakeStore('amazon', [raw('Monitor', 'amazon')])],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    const req = { query: 'monitor', weights };
    await useCase.search(req);
    const second = await useCase.search(req);
    expect(second.fromCache).toBe(true);
  });

  it('aggregates results from multiple stores', async () => {
    const useCase = new ProductSearch(
      [
        new FakeStore('amazon', [raw('Product A', 'amazon')]),
        new FakeStore('meli', [raw('Product B', 'meli')]),
      ],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    const response = await useCase.search({ query: 'product', weights });
    expect(response.results.length).toBe(2);
  });

  it('throws AllStoresFailed when all stores return empty results', async () => {
    const useCase = new ProductSearch(
      [new FakeStore('amazon', [])],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    await expect(useCase.search({ query: 'nothing', weights })).rejects.toBeInstanceOf(AllStoresFailed);
  });

  it('throws AllStoresFailed when all stores throw', async () => {
    const useCase = new ProductSearch(
      [new FailingStore()],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    await expect(useCase.search({ query: 'anything', weights })).rejects.toBeInstanceOf(AllStoresFailed);
  });

  it('returns results when at least one store succeeds despite others failing', async () => {
    const useCase = new ProductSearch(
      [new FailingStore(), new FakeStore('amazon', [raw('Monitor', 'amazon')])],
      new FakeNormalizer(),
      new FakeRanker(),
      new FakeCache(),
    );
    const response = await useCase.search({ query: 'monitor', weights });
    expect(response.results.length).toBeGreaterThan(0);
  });

  it('cache key includes weights so different weights produce separate entries', async () => {
    const cache = new FakeCache();
    const useCase = new ProductSearch(
      [new FakeStore('amazon', [raw('Monitor', 'amazon')])],
      new FakeNormalizer(),
      new FakeRanker(),
      cache,
    );
    await useCase.search({ query: 'monitor', weights: SearchWeights.balanced() });
    const second = await useCase.search({ query: 'monitor', weights: SearchWeights.priceFocused() });
    expect(second.fromCache).toBe(false);
  });
});
