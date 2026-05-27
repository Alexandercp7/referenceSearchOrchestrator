import { Product } from '../../entities/Product';
import { RankedProduct } from '../../dtos/search/RankedProduct';
import { SearchWeights } from '../../valueObjects/SearchWeights';

export interface RankStrategy {
  rank(products: Product[], weights: SearchWeights): RankedProduct[];
}
