import { AlertNotFound } from '../exceptions/AlertErrors';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';

export class AlertRemoval {
  constructor(private readonly alerts: AlertRepository) {}

  async remove(alertId: string): Promise<void> {
    const alert = await this.alerts.findById(alertId);
    if (!alert) {
      throw new AlertNotFound(alertId);
    }
    await this.alerts.remove(alertId);
  }
}
