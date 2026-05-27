import { Alert } from '../../domain/entities/Alert';
import { PriceSnapshot } from '../../domain/entities/PriceSnapshot';
import { User } from '../../domain/entities/User';
import { NotificationGateway } from '../../domain/interfaces/gateways/NotificationGateway';

export class ConsoleNotificationGateway implements NotificationGateway {
  async notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[NOTIFY] user=${user.email.value} alert=${alert.id} product=${alert.productUrl} price=${snapshot.price.toString()}`,
    );
  }
}
