import { InvalidScore } from '../exceptions/SearchErrors';
import { Money } from './Money';

export class RankedProduct {
  readonly productId: string;
  readonly title: string;
  readonly store: string;
  readonly url: string;
  readonly price: Money;
  readonly score: number;

  constructor(
    productId: string,
    title: string,
    store: string,
    url: string,
    price: Money,
    score: number,
  ) {
    if (Number.isNaN(score) || score < 0 || score > 1) {
      throw new InvalidScore(score);
    }
    this.productId = productId;
    this.title = title;
    this.store = store;
    this.url = url;
    this.price = price;
    this.score = score;
  }
}
