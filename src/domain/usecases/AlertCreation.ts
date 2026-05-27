import { randomUUID } from 'node:crypto';
import { CreateAlertRequest } from '../dtos/alerts/CreateAlertRequest';
import { Alert } from '../entities/Alert';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';

export class AlertCreation {
  constructor(private readonly alerts: AlertRepository) {}

  async create(request: CreateAlertRequest): Promise<Alert> {
    const alert = new Alert(
      randomUUID(),
      request.userId,
      request.productUrl,
      request.condition,
      true,
      null,
    );
    await this.alerts.save(alert);
    return alert;
  }
}
