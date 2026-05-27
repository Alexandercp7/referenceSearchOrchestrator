import { Alert } from '../../domain/entities/Alert';
import { AlertRepository } from '../../domain/interfaces/repositories/AlertRepository';

export class InMemoryAlertRepository implements AlertRepository {
  private readonly alerts = new Map<string, Alert>();

  async findById(id: string): Promise<Alert | null> {
    return this.alerts.get(id) ?? null;
  }

  async findActive(): Promise<Alert[]> {
    return [...this.alerts.values()].filter((a) => a.active);
  }

  async findByUser(userId: string): Promise<Alert[]> {
    return [...this.alerts.values()].filter((a) => a.userId === userId);
  }

  async save(alert: Alert): Promise<void> {
    this.alerts.set(alert.id, alert);
  }

  async remove(id: string): Promise<void> {
    this.alerts.delete(id);
  }
}
