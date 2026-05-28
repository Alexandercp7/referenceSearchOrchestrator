import { WatchlistItemView } from '../dtos/watchlist/WatchlistItemView';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../interfaces/repositories/WatchlistRepository';

export class WatchlistView {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly history: PriceHistoryRepository,
  ) {}

  async list(userId: string): Promise<WatchlistItemView[]> {
    const items = await this.watchlist.findByUser(userId);
    if (items.length === 0) return [];

    const latestByUrl = await this.history.getLatestBatch(items.map((i) => i.productUrl));

    return items.map((item) => ({
      id: item.id,
      productUrl: item.productUrl,
      store: item.store,
      title: item.title,
      addedAt: item.addedAt,
      currentPrice: latestByUrl.get(item.productUrl)?.price ?? null,
    }));
  }
}
