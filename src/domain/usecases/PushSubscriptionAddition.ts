import { PushSubscription } from '../entities/PushSubscription';
import { IdGenerator } from '../interfaces/gateways/IdGenerator';
import { PushSubscriptionRepository } from '../interfaces/repositories/PushSubscriptionRepository';

export interface SubscribeRequest {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class PushSubscriptionAddition {
  constructor(
    private readonly subs: PushSubscriptionRepository,
    private readonly ids: IdGenerator,
  ) {}

  async subscribe(request: SubscribeRequest): Promise<void> {
    const sub = new PushSubscription(
      this.ids.generate(),
      request.userId,
      request.endpoint,
      request.p256dh,
      request.auth,
    );
    await this.subs.save(sub);
  }
}
