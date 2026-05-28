import { RawProduct } from '../../dtos/search/RawProduct';

export interface StoreProductLookup {
  readonly name: string;
  fetchOne(url: string): Promise<RawProduct | null>;
}
