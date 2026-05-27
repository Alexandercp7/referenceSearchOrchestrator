import { RawProduct } from './RawProduct';

export interface FetchableStore {
  readonly name: string;
  fetchOne(url: string): Promise<RawProduct | null>;
}
