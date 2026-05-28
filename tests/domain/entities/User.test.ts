import { describe, expect, it } from 'vitest';
import { User } from '../../../src/domain/entities/User';
import { Email } from '../../../src/domain/valueObjects/Email';
import { asPasswordHash } from '../../../src/domain/valueObjects/PasswordHash';

describe('User', () => {
  it('builds with all properties', () => {
    const email = new Email('user@example.com');
    const hash = asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa');
    const now = new Date('2024-01-01');
    const user = new User('user-1', email, hash, now);

    expect(user.id).toBe('user-1');
    expect(user.email).toBe(email);
    expect(user.passwordHash).toBe(hash);
    expect(user.createdAt).toBe(now);
  });
});
