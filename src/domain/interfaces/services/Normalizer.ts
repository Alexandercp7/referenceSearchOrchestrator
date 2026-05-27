import { Product } from '../../entities/Product';
import { RawProduct } from '../stores/Store';

export interface Normalizer {
  normalize(raw: RawProduct): Product;
}
