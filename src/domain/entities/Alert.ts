import { InvalidProductUrl } from '../exceptions/SearchErrors';
import { AlertCondition } from '../valueObjects/AlertCondition';

export class Alert {
  readonly id: string;
  readonly userId: string;
  readonly productUrl: string;
  readonly condition: AlertCondition;
  readonly active: boolean;
  readonly lastTriggeredAt: Date | null;

  constructor(
    id: string,
    userId: string,
    productUrl: string,
    condition: AlertCondition,
    active: boolean,
    lastTriggeredAt: Date | null,
  ) {
    if (!productUrl) {
      throw new InvalidProductUrl(productUrl);
    }
    this.id = id;
    this.userId = userId;
    this.productUrl = productUrl;
    this.condition = condition;
    this.active = active;
    this.lastTriggeredAt = lastTriggeredAt;
  }

  trigger(at: Date): Alert {
    return new Alert(this.id, this.userId, this.productUrl, this.condition, this.active, at);
  }
}
