import { WatchlistItemNotFound } from '../exceptions/WatchlistErrors';
import { WatchlistRepository } from '../interfaces/repositories/WatchlistRepository';

export class WatchlistRemoval {
  constructor(private readonly watchlist: WatchlistRepository) {}

  async remove(itemId: string): Promise<void> {
    const item = await this.watchlist.findById(itemId);
    if (!item) {
      throw new WatchlistItemNotFound(itemId);
    }
    await this.watchlist.remove(itemId);
  }
}
