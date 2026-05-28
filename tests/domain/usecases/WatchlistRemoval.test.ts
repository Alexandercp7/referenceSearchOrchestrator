import { beforeEach, describe, expect, it } from 'vitest';
import { WatchlistItem } from '../../../src/domain/entities/WatchlistItem';
import { WatchlistItemNotFound } from '../../../src/domain/exceptions/WatchlistErrors';
import { WatchlistRepository } from '../../../src/domain/interfaces/repositories/WatchlistRepository';
import { WatchlistRemoval } from '../../../src/domain/usecases/WatchlistRemoval';

class FakeWatchlist implements WatchlistRepository {
  private store = new Map<string, WatchlistItem>();
  readonly removed: string[] = [];

  seed(item: WatchlistItem): void { this.store.set(item.id, item); }
  async findById(id: string): Promise<WatchlistItem | null> { return this.store.get(id) ?? null; }
  async findByUser(): Promise<WatchlistItem[]> { return []; }
  async findAll(): Promise<WatchlistItem[]> { return [...this.store.values()]; }
  async exists(): Promise<boolean> { return false; }
  async save(): Promise<void> {}
  async remove(id: string): Promise<void> { this.store.delete(id); this.removed.push(id); }
}

describe('WatchlistRemoval', () => {
  let repo: FakeWatchlist;
  let useCase: WatchlistRemoval;

  beforeEach(() => {
    repo = new FakeWatchlist();
    useCase = new WatchlistRemoval(repo);
  });

  it('removes an existing watchlist item', async () => {
    const item = new WatchlistItem('i1', 'user-1', 'https://example.com', 'amazon', 'Monitor', new Date());
    repo.seed(item);
    await useCase.remove('i1');
    expect(repo.removed).toContain('i1');
  });

  it('throws WatchlistItemNotFound when item does not exist', async () => {
    await expect(useCase.remove('nonexistent')).rejects.toBeInstanceOf(WatchlistItemNotFound);
  });
});
