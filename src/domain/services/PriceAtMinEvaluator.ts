import { PriceSnapshot } from '../entities/PriceSnapshot';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { AlertConditionEvaluator } from '../interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../valueObjects/AlertCondition';
import { DateRange } from '../valueObjects/DateRange';

export class PriceAtMinEvaluator implements AlertConditionEvaluator {
  readonly kind = 'PriceAtMin' as const;

  async matches(
    condition: AlertCondition,
    snapshot: PriceSnapshot,
    history: PriceHistoryRepository,
  ): Promise<boolean> {
    if (condition.kind !== 'PriceAtMin') return false;
    const range = DateRange.lastDays(condition.lookbackDays, snapshot.scrapedAt);
    const min = await history.getMin(snapshot.productUrl, range);
    return min !== null && snapshot.price.equals(min);
  }
}
