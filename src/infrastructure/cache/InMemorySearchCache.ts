import { SearchResponse } from '../../domain/dtos/search/SearchResponse';
import { SearchCache } from '../../domain/interfaces/services/SearchCache';

interface Entry {
  response: SearchResponse;
  expiresAt: number;
}

export class InMemorySearchCache implements SearchCache {
  private readonly entries = new Map<string, Entry>();

  async get(key: string): Promise<SearchResponse | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.response;
  }

  async set(key: string, response: SearchResponse, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { response, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
