import { PriceSnapshot } from '../../domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../domain/interfaces/repositories/PriceHistoryRepository';
import { DateRange } from '../../domain/valueObjects/DateRange';
import { Money } from '../../domain/valueObjects/Money';

export class InMemoryPriceHistoryRepository implements PriceHistoryRepository {
  private readonly snapshots: PriceSnapshot[] = [];

  async saveSnapshot(snapshot: PriceSnapshot): Promise<void> {
    this.snapshots.push(snapshot);
  }

  async getHistory(productUrl: string, range: DateRange): Promise<PriceSnapshot[]> {
    return this.snapshots
      .filter((s) => s.productUrl === productUrl && range.contains(s.scrapedAt))
      .sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime());
  }

  async getLatest(productUrl: string): Promise<PriceSnapshot | null> {
    const matches = this.snapshots
      .filter((s) => s.productUrl === productUrl)
      .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
    return matches[0] ?? null;
  }

  async getMin(productUrl: string, range: DateRange): Promise<Money | null> {
    const history = await this.getHistory(productUrl, range);
    if (history.length === 0) return null;

    let min = history[0]!.price;
    for (const snapshot of history) {
      if (snapshot.price.isLessThan(min)) {
        min = snapshot.price;
      }
    }
    return min;
  }
}
