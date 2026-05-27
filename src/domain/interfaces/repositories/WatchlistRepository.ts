import { WatchlistItem } from '../../entities/WatchlistItem';

export interface WatchlistRepository {
  findById(id: string): Promise<WatchlistItem | null>;
  findByUser(userId: string): Promise<WatchlistItem[]>;
  findAll(): Promise<WatchlistItem[]>;
  exists(userId: string, productUrl: string): Promise<boolean>;
  save(item: WatchlistItem): Promise<void>;
  remove(id: string): Promise<void>;
}
