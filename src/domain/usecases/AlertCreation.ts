import { CreateAlertRequest } from '../dtos/alerts/CreateAlertRequest';
import { Alert } from '../entities/Alert';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';
import { IdGenerator } from '../interfaces/gateways/IdGenerator';

export class AlertCreation {
  constructor(
    private readonly alerts: AlertRepository,
    private readonly ids: IdGenerator,
  ) {}

  async create(request: CreateAlertRequest): Promise<Alert> {
    const alert = new Alert(
      this.ids.generate(),
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
