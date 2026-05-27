import { Alert } from '../../entities/Alert';

export interface AlertRepository {
  findById(id: string): Promise<Alert | null>;
  findActive(): Promise<Alert[]>;
  findByUser(userId: string): Promise<Alert[]>;
  save(alert: Alert): Promise<void>;
  remove(id: string): Promise<void>;
}
