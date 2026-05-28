import { PriceSnapshot } from '../entities/PriceSnapshot';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { AlertConditionEvaluator } from '../interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../valueObjects/AlertCondition';
import { DateRange } from '../valueObjects/DateRange';

export class PriceDropPctEvaluator implements AlertConditionEvaluator {
  readonly kind = 'PriceDropPct' as const;

  async matches(
    condition: AlertCondition,
    snapshot: PriceSnapshot,
    history: PriceHistoryRepository,
  ): Promise<boolean> {
    if (condition.kind !== 'PriceDropPct') return false;
    const range = DateRange.lastDays(condition.lookbackDays, snapshot.scrapedAt);
    const snapshots = await history.getHistory(snapshot.productUrl, range);
    if (snapshots.length < 2) return false;
    const previous = snapshots[snapshots.length - 2];
    if (!previous) return false;
    return snapshot.price.percentDropFrom(previous.price) >= condition.percent;
  }
}
