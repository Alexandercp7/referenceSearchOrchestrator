import { AlertCondition } from '../../valueObjects/AlertCondition';

export interface AlertView {
  id: string;
  productUrl: string;
  condition: AlertCondition;
  active: boolean;
  lastTriggeredAt: Date | null;
}
