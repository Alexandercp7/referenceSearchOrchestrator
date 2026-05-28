import { RawProduct } from '../../dtos/search/RawProduct';

export interface StoreProductSearch {
  readonly name: string;
  search(query: string): Promise<RawProduct[]>;
}
