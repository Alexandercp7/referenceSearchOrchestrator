import { InvalidProductUrl } from '../exceptions/SearchErrors';

export class WatchlistItem {
  readonly id: string;
  readonly userId: string;
  readonly productUrl: string;
  readonly store: string;
  readonly title: string;
  readonly addedAt: Date;

  constructor(
    id: string,
    userId: string,
    productUrl: string,
    store: string,
    title: string,
    addedAt: Date,
  ) {
    if (!productUrl) {
      throw new InvalidProductUrl(productUrl);
    }
    this.id = id;
    this.userId = userId;
    this.productUrl = productUrl;
    this.store = store;
    this.title = title;
    this.addedAt = addedAt;
  }
}
