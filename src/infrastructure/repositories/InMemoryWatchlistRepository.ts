import { WatchlistItem } from '../../domain/entities/WatchlistItem';
import { WatchlistRepository } from '../../domain/interfaces/repositories/WatchlistRepository';

export class InMemoryWatchlistRepository implements WatchlistRepository {
  private readonly items = new Map<string, WatchlistItem>();

  async findById(id: string): Promise<WatchlistItem | null> {
    return this.items.get(id) ?? null;
  }

  async findByUser(userId: string): Promise<WatchlistItem[]> {
    return [...this.items.values()].filter((item) => item.userId === userId);
  }

  async findAll(): Promise<WatchlistItem[]> {
    return [...this.items.values()];
  }

  async exists(userId: string, productUrl: string): Promise<boolean> {
    for (const item of this.items.values()) {
      if (item.userId === userId && item.productUrl === productUrl) {
        return true;
      }
    }
    return false;
  }

  async save(item: WatchlistItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async remove(id: string): Promise<void> {
    this.items.delete(id);
  }
}
