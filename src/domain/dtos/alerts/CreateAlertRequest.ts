import { AlertCondition } from '../../valueObjects/AlertCondition';

export interface CreateAlertRequest {
  userId: string;
  productUrl: string;
  condition: AlertCondition;
}
