import { Pool } from 'mysql2/promise';
import { User } from '../../../domain/entities/User';
import { UserRepository } from '../../../domain/interfaces/repositories/UserRepository';
import { Email } from '../../../domain/valueObjects/Email';
import { UserMapper, UserRow } from '../mappers/UserMapper';

export class MysqlUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const [rows] = await this.pool.execute(
      'SELECT id, email, password_hash, display_name, created_at FROM users WHERE id = ?',
      [id],
    );
    const row = (rows as UserRow[])[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const [rows] = await this.pool.execute(
      'SELECT id, email, password_hash, display_name, created_at FROM users WHERE email = ?',
      [email.value],
    );
    const row = (rows as UserRow[])[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toRow(user);
    await this.pool.execute(
      `INSERT INTO users (id, email, password_hash, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash  = VALUES(password_hash),
         display_name   = VALUES(display_name)`,
      [row.id, row.email, row.password_hash, row.display_name, row.created_at],
    );
  }
}
