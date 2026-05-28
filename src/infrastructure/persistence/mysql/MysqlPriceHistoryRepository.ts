import { Pool } from 'mysql2/promise';
import { PriceSnapshot } from '../../../domain/entities/PriceSnapshot';
import { PriceHistoryRepository } from '../../../domain/interfaces/repositories/PriceHistoryRepository';
import { DateRange } from '../../../domain/valueObjects/DateRange';
import { Money } from '../../../domain/valueObjects/Money';
import { PriceSnapshotMapper, PriceSnapshotRow } from '../mappers/PriceSnapshotMapper';

export class MysqlPriceHistoryRepository implements PriceHistoryRepository {
  constructor(private readonly pool: Pool) {}

  async saveSnapshot(snapshot: PriceSnapshot): Promise<void> {
    const row = PriceSnapshotMapper.toRow(snapshot);
    await this.pool.execute(
      'INSERT INTO price_snapshots (id, product_url, store, amount, currency, scraped_at) VALUES (?, ?, ?, ?, ?, ?)',
      [row.id, row.product_url, row.store, row.amount, row.currency, row.scraped_at],
    );
  }

  async getHistory(productUrl: string, range: DateRange): Promise<PriceSnapshot[]> {
    const [rows] = await this.pool.execute(
      `SELECT id, product_url, store, amount, currency, scraped_at
       FROM price_snapshots
       WHERE product_url = ? AND scraped_at BETWEEN ? AND ?
       ORDER BY scraped_at ASC`,
      [productUrl, range.from, range.to],
    );
    return (rows as PriceSnapshotRow[]).map((r) => PriceSnapshotMapper.toDomain(r));
  }

  async getLatest(productUrl: string): Promise<PriceSnapshot | null> {
    const [rows] = await this.pool.execute(
      `SELECT id, product_url, store, amount, currency, scraped_at
       FROM price_snapshots
       WHERE product_url = ?
       ORDER BY scraped_at DESC
       LIMIT 1`,
      [productUrl],
    );
    const row = (rows as PriceSnapshotRow[])[0];
    return row ? PriceSnapshotMapper.toDomain(row) : null;
  }

  async getMin(productUrl: string, range: DateRange): Promise<Money | null> {
    const [rows] = await this.pool.execute(
      `SELECT amount, currency
       FROM price_snapshots
       WHERE product_url = ? AND scraped_at BETWEEN ? AND ?
       ORDER BY CAST(amount AS DECIMAL(15,2)) ASC
       LIMIT 1`,
      [productUrl, range.from, range.to],
    );
    const row = (rows as { amount: string; currency: string }[])[0];
    return row ? new Money(row.amount, row.currency) : null;
  }
}
