import { Product } from '../../entities/Product';
import { RawProduct } from '../../dtos/search/RawProduct';

export interface Normalizer {
  normalize(raw: RawProduct): Product;
}
