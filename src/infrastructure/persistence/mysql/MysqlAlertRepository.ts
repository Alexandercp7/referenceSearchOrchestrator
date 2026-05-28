import { Pool } from 'mysql2/promise';
import { Alert } from '../../../domain/entities/Alert';
import { AlertRepository } from '../../../domain/interfaces/repositories/AlertRepository';
import { AlertMapper, AlertRow } from '../mappers/AlertMapper';

const COLS = 'id, user_id, product_url, condition_json, active, last_triggered_at';

export class MysqlAlertRepository implements AlertRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Alert | null> {
    const [rows] = await this.pool.execute(
      `SELECT ${COLS} FROM alerts WHERE id = ?`,
      [id],
    );
    const row = (rows as AlertRow[])[0];
    return row ? AlertMapper.toDomain(row) : null;
  }

  async findActive(): Promise<Alert[]> {
    const [rows] = await this.pool.execute(
      `SELECT ${COLS} FROM alerts WHERE active = 1`,
    );
    return (rows as AlertRow[]).map((r) => AlertMapper.toDomain(r));
  }

  async findByUser(userId: string): Promise<Alert[]> {
    const [rows] = await this.pool.execute(
      `SELECT ${COLS} FROM alerts WHERE user_id = ?`,
      [userId],
    );
    return (rows as AlertRow[]).map((r) => AlertMapper.toDomain(r));
  }

  async save(alert: Alert): Promise<void> {
    const row = AlertMapper.toRow(alert);
    await this.pool.execute(
      `INSERT INTO alerts (id, user_id, product_url, condition_json, active, last_triggered_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         condition_json     = VALUES(condition_json),
         active             = VALUES(active),
         last_triggered_at  = VALUES(last_triggered_at)`,
      [row.id, row.user_id, row.product_url, row.condition_json, row.active, row.last_triggered_at],
    );
  }

  async remove(id: string): Promise<void> {
    await this.pool.execute('DELETE FROM alerts WHERE id = ?', [id]);
  }
}
