import { InvalidWeights } from '../exceptions/SearchErrors';

const EPSILON = 0.001;

export class SearchWeights {
  readonly price: number;
  readonly stock: number;
  readonly delivery: number;
  readonly msi: number;

  constructor(price: number, stock: number, delivery: number, msi: number) {
    this.assertRange('price', price);
    this.assertRange('stock', stock);
    this.assertRange('delivery', delivery);
    this.assertRange('msi', msi);

    const sum = price + stock + delivery + msi;
    if (Math.abs(sum - 1) > EPSILON) {
      throw new InvalidWeights(`Weights must sum to 1.0, got ${sum.toFixed(4)}`);
    }

    this.price = price;
    this.stock = stock;
    this.delivery = delivery;
    this.msi = msi;
  }

  static balanced(): SearchWeights {
    return new SearchWeights(0.25, 0.25, 0.25, 0.25);
  }

  static priceFocused(): SearchWeights {
    return new SearchWeights(0.7, 0.1, 0.1, 0.1);
  }

  private assertRange(name: string, value: number): void {
    if (Number.isNaN(value) || value < 0 || value > 1) {
      throw new InvalidWeights(`${name} must be a number in [0, 1], got ${value}`);
    }
  }
}
