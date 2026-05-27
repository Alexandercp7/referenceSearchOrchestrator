import { InvalidProductUrl } from '../exceptions/SearchErrors';
import { Money } from '../valueObjects/Money';

export class PriceSnapshot {
  readonly id: string;
  readonly productUrl: string;
  readonly store: string;
  readonly price: Money;
  readonly scrapedAt: Date;

  constructor(id: string, productUrl: string, store: string, price: Money, scrapedAt: Date) {
    if (!productUrl) {
      throw new InvalidProductUrl(productUrl);
    }
    this.id = id;
    this.productUrl = productUrl;
    this.store = store;
    this.price = price;
    this.scrapedAt = scrapedAt;
  }
}
