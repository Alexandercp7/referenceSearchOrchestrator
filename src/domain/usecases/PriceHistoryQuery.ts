import { HistoryQuery } from '../dtos/priceHistory/HistoryQuery';
import { PricePoint } from '../dtos/priceHistory/PricePoint';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';

export class PriceHistoryQuery {
  constructor(private readonly history: PriceHistoryRepository) {}

  async query(request: HistoryQuery): Promise<PricePoint[]> {
    const snapshots = await this.history.getHistory(request.productUrl, request.range);
    return snapshots.map((s) => ({ timestamp: s.scrapedAt, price: s.price }));
  }
}
