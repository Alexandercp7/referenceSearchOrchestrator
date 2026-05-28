import { Pool } from 'mysql2/promise';
import { PushSubscription } from '../../../domain/entities/PushSubscription';
import { PushSubscriptionRepository } from '../../../domain/interfaces/repositories/PushSubscriptionRepository';

interface PushRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class MysqlPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly pool: Pool) {}

  async save(sub: PushSubscription): Promise<void> {
    await this.pool.execute(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [sub.id, sub.userId, sub.endpoint, sub.p256dh, sub.auth],
    );
  }

  async findByUser(userId: string): Promise<PushSubscription[]> {
    const [rows] = await this.pool.execute(
      'SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
      [userId],
    );
    return (rows as PushRow[]).map(
      (r) => new PushSubscription(r.id, r.user_id, r.endpoint, r.p256dh, r.auth),
    );
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.pool.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  }

  async removeByUserAndEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.pool.execute(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint],
    );
  }
}
