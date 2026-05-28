import { PushSubscription } from '../../entities/PushSubscription';

export interface PushSubscriptionRepository {
  save(sub: PushSubscription): Promise<void>;
  findByUser(userId: string): Promise<PushSubscription[]>;
  removeByEndpoint(endpoint: string): Promise<void>;
  removeByUserAndEndpoint(userId: string, endpoint: string): Promise<void>;
}
