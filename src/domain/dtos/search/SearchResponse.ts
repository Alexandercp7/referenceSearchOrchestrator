import { RankedProduct } from './RankedProduct';

export interface SearchResponse {
  query: string;
  results: RankedProduct[];
  fromCache: boolean;
}
