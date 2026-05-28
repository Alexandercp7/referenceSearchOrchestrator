import webpush from 'web-push';
import { User } from '../../domain/entities/User';
import { NotificationGateway, TriggeredAlert } from '../../domain/interfaces/gateways/NotificationGateway';
import { PushSubscriptionRepository } from '../../domain/interfaces/repositories/PushSubscriptionRepository';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export class WebPushNotificationGateway implements NotificationGateway {
  constructor(
    private readonly subs: PushSubscriptionRepository,
    config: VapidConfig,
  ) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  }

  async notify(user: User, items: TriggeredAlert[]): Promise<void> {
    const subscriptions = await this.subs.findByUser(user.id);
    if (subscriptions.length === 0) return;

    await Promise.allSettled(
      items.map(({ alert, snapshot }) => {
        const payload = JSON.stringify({
          title: snapshot.title || 'Alerta de precio disparada',
          body: `${snapshot.price.toString()}${snapshot.title ? ` — ${snapshot.title}` : ''}`,
          url: alert.productUrl,
        });
        return Promise.allSettled(
          subscriptions.map((sub) =>
            webpush
              .sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload,
              )
              .catch((err: { statusCode?: number }) => {
                if (err.statusCode === 410) return this.subs.removeByEndpoint(sub.endpoint);
              }),
          ),
        );
      }),
    );
  }
}
