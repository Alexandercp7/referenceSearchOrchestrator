import { PriceSnapshot } from '../entities/PriceSnapshot';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { AlertConditionEvaluator } from '../interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../valueObjects/AlertCondition';

export class PriceBelowEvaluator implements AlertConditionEvaluator {
  readonly kind = 'PriceBelow' as const;

  async matches(
    condition: AlertCondition,
    snapshot: PriceSnapshot,
    _history: PriceHistoryRepository,
  ): Promise<boolean> {
    if (condition.kind !== 'PriceBelow') return false;
    return snapshot.price.isLessThan(condition.threshold);
  }
}
