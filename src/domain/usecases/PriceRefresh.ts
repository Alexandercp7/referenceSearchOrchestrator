import { PriceSnapshot } from '../entities/PriceSnapshot';
import { WatchlistItem } from '../entities/WatchlistItem';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../interfaces/repositories/WatchlistRepository';
import { IdGenerator } from '../interfaces/gateways/IdGenerator';
import { Normalizer } from '../interfaces/services/Normalizer';
import { StoreProductLookup } from '../interfaces/stores/StoreProductLookup';

export class PriceRefresh {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly history: PriceHistoryRepository,
    private readonly stores: Map<string, StoreProductLookup>,
    private readonly normalizer: Normalizer,
    private readonly ids: IdGenerator,
  ) {}

  async refresh(): Promise<void> {
    const items = await this.watchlist.findAll();
    await Promise.allSettled(items.map((item) => this.refreshItem(item)));
  }

  private async refreshItem(item: WatchlistItem): Promise<void> {
    const store = this.stores.get(item.store);
    if (!store) return;

    const raw = await store.fetchOne(item.productUrl);
    if (!raw) return;

    const product = this.normalizer.normalize(raw);
    const snapshot = new PriceSnapshot(
      this.ids.generate(),
      item.productUrl,
      item.store,
      product.price,
      new Date(),
    );
    await this.history.saveSnapshot(snapshot);
  }
}
