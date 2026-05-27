import { SearchRequest } from '../dtos/search/SearchRequest';
import { SearchResponse } from '../dtos/search/SearchResponse';
import { AllStoresFailed } from '../exceptions/SearchErrors';
import { Normalizer } from '../interfaces/services/Normalizer';
import { RankStrategy } from '../interfaces/services/RankStrategy';
import { SearchCache } from '../interfaces/services/SearchCache';
import { SearchableStore } from '../interfaces/stores/SearchableStore';

export class ProductSearch {
  constructor(
    private readonly stores: SearchableStore[],
    private readonly normalizer: Normalizer,
    private readonly ranker: RankStrategy,
    private readonly cache: SearchCache,
    private readonly cacheTtlSeconds: number = 300,
  ) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const key = this.buildCacheKey(request);

    const cached = await this.cache.get(key);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    const settled = await Promise.allSettled(this.stores.map((s) => s.search(request.query)));
    const rawProducts = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    if (rawProducts.length === 0) {
      throw new AllStoresFailed(request.query);
    }

    const products = rawProducts.map((raw) => this.normalizer.normalize(raw));
    const ranked = this.ranker.rank(products, request.weights);

    const response: SearchResponse = {
      query: request.query,
      results: ranked,
      fromCache: false,
    };
    await this.cache.set(key, response, this.cacheTtlSeconds);
    return response;
  }

  private buildCacheKey({ query, weights }: SearchRequest): string {
    return `search:${query}:${weights.price}:${weights.stock}:${weights.delivery}:${weights.msi}`;
  }
}
