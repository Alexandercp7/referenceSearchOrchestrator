export type { RawProduct } from './RawProduct';
export type { SearchableStore } from './SearchableStore';
export type { FetchableStore } from './FetchableStore';

import { FetchableStore } from './FetchableStore';
import { SearchableStore } from './SearchableStore';

export type Store = SearchableStore & FetchableStore;
