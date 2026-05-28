import { Alert } from '../../entities/Alert';
import { PriceSnapshot } from '../../entities/PriceSnapshot';
import { User } from '../../entities/User';

export interface TriggeredAlert {
  alert: Alert;
  snapshot: PriceSnapshot;
}

export interface NotificationGateway {
  notify(user: User, items: TriggeredAlert[]): Promise<void>;
}
