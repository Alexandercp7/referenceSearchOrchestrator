import { PushSubscriptionRepository } from '../interfaces/repositories/PushSubscriptionRepository';

export class PushSubscriptionRemoval {
  constructor(private readonly subs: PushSubscriptionRepository) {}

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subs.removeByUserAndEndpoint(userId, endpoint);
  }
}
