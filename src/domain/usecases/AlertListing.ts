import { AlertView } from '../dtos/alerts/AlertView';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';

export class AlertListing {
  constructor(private readonly alerts: AlertRepository) {}

  async list(userId: string): Promise<AlertView[]> {
    const alerts = await this.alerts.findByUser(userId);
    return alerts.map((alert) => ({
      id: alert.id,
      productUrl: alert.productUrl,
      condition: alert.condition,
      active: alert.active,
      lastTriggeredAt: alert.lastTriggeredAt,
    }));
  }
}
