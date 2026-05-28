import { SearchResponse } from '../../domain/dtos/search/SearchResponse';
import { SearchCache } from '../../domain/interfaces/services/SearchCache';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
}

export class RedisSearchCache implements SearchCache {
  constructor(private readonly client: RedisClient) {}

  async get(key: string): Promise<SearchResponse | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as SearchResponse;
  }

  async set(key: string, response: SearchResponse, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(response), { EX: ttlSeconds });
  }
}
