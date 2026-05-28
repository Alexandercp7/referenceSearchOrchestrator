import { User } from '../../domain/entities/User';
import { NotificationGateway, TriggeredAlert } from '../../domain/interfaces/gateways/NotificationGateway';

export class CompositeNotificationGateway implements NotificationGateway {
  constructor(private readonly gateways: NotificationGateway[]) {}

  async notify(user: User, items: TriggeredAlert[]): Promise<void> {
    await Promise.allSettled(this.gateways.map((g) => g.notify(user, items)));
  }
}
