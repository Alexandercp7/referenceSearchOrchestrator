import { Pool } from 'mysql2/promise';
import { WatchlistItem } from '../../../domain/entities/WatchlistItem';
import { WatchlistRepository } from '../../../domain/interfaces/repositories/WatchlistRepository';
import { WatchlistItemMapper, WatchlistItemRow } from '../mappers/WatchlistItemMapper';

const COLS = 'id, user_id, product_url, store, title, added_at';

export class MysqlWatchlistRepository implements WatchlistRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<WatchlistItem | null> {
    const [rows] = await this.pool.execute(
      `SELECT ${COLS} FROM watchlist_items WHERE id = ?`,
      [id],
    );
    const row = (rows as WatchlistItemRow[])[0];
    return row ? WatchlistItemMapper.toDomain(row) : null;
  }

  async findByUser(userId: string): Promise<WatchlistItem[]> {
    const [rows] = await this.pool.execute(
      `SELECT ${COLS} FROM watchlist_items WHERE user_id = ?`,
      [userId],
    );
    return (rows as WatchlistItemRow[]).map((r) => WatchlistItemMapper.toDomain(r));
  }

  async findAll(): Promise<WatchlistItem[]> {
    const [rows] = await this.pool.execute(`SELECT ${COLS} FROM watchlist_items`);
    return (rows as WatchlistItemRow[]).map((r) => WatchlistItemMapper.toDomain(r));
  }

  async exists(userId: string, productUrl: string): Promise<boolean> {
    const [rows] = await this.pool.execute(
      'SELECT 1 FROM watchlist_items WHERE user_id = ? AND product_url = ? LIMIT 1',
      [userId, productUrl],
    );
    return (rows as unknown[]).length > 0;
  }

  async save(item: WatchlistItem): Promise<void> {
    const row = WatchlistItemMapper.toRow(item);
    await this.pool.execute(
      `INSERT INTO watchlist_items (id, user_id, product_url, store, title, added_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         store = VALUES(store),
         title = VALUES(title)`,
      [row.id, row.user_id, row.product_url, row.store, row.title, row.added_at],
    );
  }

  async remove(id: string): Promise<void> {
    await this.pool.execute('DELETE FROM watchlist_items WHERE id = ?', [id]);
  }
}
