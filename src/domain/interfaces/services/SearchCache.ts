import { SearchResponse } from '../../dtos/search/SearchResponse';

export interface SearchCache {
  get(key: string): Promise<SearchResponse | null>;
  set(key: string, response: SearchResponse, ttlSeconds: number): Promise<void>;
}
