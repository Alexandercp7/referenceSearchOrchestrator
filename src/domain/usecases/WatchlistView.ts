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

    return Promise.all(
      items.map(async (item) => {
        const latest = await this.history.getLatest(item.productUrl);
        return {
          id: item.id,
          productUrl: item.productUrl,
          store: item.store,
          title: item.title,
          addedAt: item.addedAt,
          currentPrice: latest ? latest.price : null,
        };
      }),
    );
  }
}
