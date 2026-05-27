import { PriceSnapshot } from '../../entities/PriceSnapshot';
import { PriceHistoryRepository } from '../repositories/PriceHistoryRepository';
import { AlertCondition } from '../../valueObjects/AlertCondition';

export interface AlertConditionEvaluator {
  readonly kind: AlertCondition['kind'];
  matches(
    condition: AlertCondition,
    snapshot: PriceSnapshot,
    history: PriceHistoryRepository,
  ): Promise<boolean>;
}
