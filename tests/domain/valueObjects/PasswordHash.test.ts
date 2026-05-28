import { describe, expect, it } from 'vitest';
import { InvalidPasswordHash } from '../../../src/domain/exceptions/UserErrors';
import { asPasswordHash } from '../../../src/domain/valueObjects/PasswordHash';

describe('PasswordHash', () => {
  it('accepts a string of at least 20 characters', () => {
    const hash = asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa');
    expect(typeof hash).toBe('string');
    expect(hash).toBe('$2b$10$aaaaaaaaaaaaaaaaaaaa');
  });

  it('accepts exactly 20 characters', () => {
    expect(() => asPasswordHash('12345678901234567890')).not.toThrow();
  });

  it('accepts strings longer than 20 characters', () => {
    const long = '$2b$10$' + 'a'.repeat(53);
    expect(() => asPasswordHash(long)).not.toThrow();
  });

  it('rejects a string shorter than 20 characters', () => {
    expect(() => asPasswordHash('tooshort')).toThrow(InvalidPasswordHash);
  });

  it('rejects an empty string', () => {
    expect(() => asPasswordHash('')).toThrow(InvalidPasswordHash);
  });

  it('rejects a 19-character string', () => {
    expect(() => asPasswordHash('1234567890123456789')).toThrow(InvalidPasswordHash);
  });
});
