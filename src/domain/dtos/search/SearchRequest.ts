import { SearchWeights } from '../../valueObjects/SearchWeights';

export interface SearchRequest {
  query: string;
  weights: SearchWeights;
}
