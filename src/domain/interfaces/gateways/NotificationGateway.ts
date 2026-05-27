import { Alert } from '../../entities/Alert';
import { PriceSnapshot } from '../../entities/PriceSnapshot';
import { User } from '../../entities/User';

export interface NotificationGateway {
  notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void>;
}
