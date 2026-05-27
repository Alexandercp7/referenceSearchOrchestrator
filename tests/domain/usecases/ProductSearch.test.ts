import { describe, expect, it } from 'vitest';
import { ProductSearch } from '../../../src/domain/usecases/ProductSearch';
import { SearchWeights } from '../../../src/domain/valueObjects/SearchWeights';
import { BasicNormalizer } from '../../../src/infrastructure/repositories/BasicNormalizer';
import { InMemorySearchCache } from '../../../src/infrastructure/repositories/InMemorySearchCache';
import { MockAmazonStore } from '../../../src/infrastructure/repositories/MockAmazonStore';
import { MockMercadoLibreStore } from '../../../src/infrastructure/repositories/MockMercadoLibreStore';
import { WeightedRankStrategy } from '../../../src/infrastructure/repositories/WeightedRankStrategy';

describe('ProductSearch', () => {
  it('returns ranked products from all stores', async () => {
    const useCase = new ProductSearch(
      [new MockAmazonStore(), new MockMercadoLibreStore()],
      new BasicNormalizer(),
      new WeightedRankStrategy(),
      new InMemorySearchCache(),
    );

    const response = await useCase.search({
      query: 'monitor',
      weights: SearchWeights.priceFocused(),
    });

    expect(response.fromCache).toBe(false);
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results[0]!.score).toBeGreaterThanOrEqual(response.results[1]!.score);
  });

  it('returns from cache on second call', async () => {
    const useCase = new ProductSearch(
      [new MockAmazonStore()],
      new BasicNormalizer(),
      new WeightedRankStrategy(),
      new InMemorySearchCache(),
    );
    const req = { query: 'laptop', weights: SearchWeights.balanced() };

    await useCase.search(req);
    const second = await useCase.search(req);
    expect(second.fromCache).toBe(true);
  });
});
