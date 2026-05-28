import { User } from '../../domain/entities/User';
import { NotificationGateway, TriggeredAlert } from '../../domain/interfaces/gateways/NotificationGateway';

export class ConsoleNotificationGateway implements NotificationGateway {
  async notify(user: User, items: TriggeredAlert[]): Promise<void> {
    for (const { snapshot } of items) {
      // eslint-disable-next-line no-console
      console.log(`[NOTIFY] ${user.email.value} | ${snapshot.price.toString()} — ${snapshot.title}`);
    }
  }
}
