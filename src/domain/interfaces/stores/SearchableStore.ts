import { RawProduct } from './RawProduct';

export interface SearchableStore {
  readonly name: string;
  search(query: string): Promise<RawProduct[]>;
}
