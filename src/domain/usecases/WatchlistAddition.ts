import { AddItemRequest } from '../dtos/watchlist/AddItemRequest';
import { PriceSnapshot } from '../entities/PriceSnapshot';
import { WatchlistItem } from '../entities/WatchlistItem';
import { ProductNotFound } from '../exceptions/SearchErrors';
import { ItemAlreadyTracked, UnknownStore } from '../exceptions/WatchlistErrors';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { WatchlistRepository } from '../interfaces/repositories/WatchlistRepository';
import { IdGenerator } from '../interfaces/gateways/IdGenerator';
import { Normalizer } from '../interfaces/services/Normalizer';
import { StoreProductLookup } from '../interfaces/stores/StoreProductLookup';

export class WatchlistAddition {
  constructor(
    private readonly watchlist: WatchlistRepository,
    private readonly history: PriceHistoryRepository,
    private readonly stores: Map<string, StoreProductLookup>,
    private readonly normalizer: Normalizer,
    private readonly ids: IdGenerator,
  ) {}

  async add(request: AddItemRequest): Promise<WatchlistItem> {
    if (await this.watchlist.exists(request.userId, request.productUrl)) {
      throw new ItemAlreadyTracked(request.productUrl);
    }

    const store = this.stores.get(request.store);
    if (!store) {
      throw new UnknownStore(request.store);
    }

    const raw = await store.fetchOne(request.productUrl);
    if (!raw) {
      throw new ProductNotFound(request.productUrl);
    }

    const product = this.normalizer.normalize(raw);
    const now = new Date();

    const item = new WatchlistItem(
      this.ids.generate(),
      request.userId,
      request.productUrl,
      request.store,
      product.title,
      now,
    );
    await this.watchlist.save(item);

    const snapshot = new PriceSnapshot(
      this.ids.generate(),
      request.productUrl,
      request.store,
      product.title,
      product.price,
      now,
    );
    try {
      await this.history.saveSnapshot(snapshot);
    } catch (err) {
      await this.watchlist.remove(item.id).catch(() => {});
      throw err;
    }

    return item;
  }
}
