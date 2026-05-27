import { Money } from '../../valueObjects/Money';

export interface PricePoint {
  timestamp: Date;
  price: Money;
}
