import { Money } from '../../valueObjects/Money';

export interface WatchlistItemView {
  id: string;
  productUrl: string;
  store: string;
  title: string;
  addedAt: Date;
  currentPrice: Money | null;
}
