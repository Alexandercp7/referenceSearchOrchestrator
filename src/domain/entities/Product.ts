import { InvalidProduct } from '../exceptions/SearchErrors';
import { Money } from '../valueObjects/Money';

export class Product {
  readonly id: string;
  readonly title: string;
  readonly price: Money;
  readonly store: string;
  readonly url: string;
  readonly inStock: boolean;
  readonly deliveryDays: number;
  readonly msi: number;

  constructor(
    id: string,
    title: string,
    price: Money,
    store: string,
    url: string,
    inStock: boolean,
    deliveryDays: number,
    msi: number = 0,
  ) {
    if (deliveryDays < 0) {
      throw new InvalidProduct(`deliveryDays must be >= 0, got ${deliveryDays}`);
    }
    if (msi < 0) {
      throw new InvalidProduct(`msi must be >= 0, got ${msi}`);
    }
    this.id = id;
    this.title = title;
    this.price = price;
    this.store = store;
    this.url = url;
    this.inStock = inStock;
    this.deliveryDays = deliveryDays;
    this.msi = msi;
  }
}
