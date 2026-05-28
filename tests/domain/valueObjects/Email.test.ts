import { describe, expect, it } from 'vitest';
import { InvalidEmail } from '../../../src/domain/exceptions/UserErrors';
import { Email } from '../../../src/domain/valueObjects/Email';

describe('Email', () => {
  it('accepts a valid email and normalizes to lowercase', () => {
    const email = new Email('USER@Example.COM');
    expect(email.value).toBe('user@example.com');
  });

  it('trims whitespace before validating', () => {
    const email = new Email('  user@example.com  ');
    expect(email.value).toBe('user@example.com');
  });

  it('rejects email without @', () => {
    expect(() => new Email('notanemail')).toThrow(InvalidEmail);
  });

  it('rejects email with missing domain part', () => {
    expect(() => new Email('user@')).toThrow(InvalidEmail);
  });

  it('rejects email with missing local part', () => {
    expect(() => new Email('@example.com')).toThrow(InvalidEmail);
  });

  it('rejects email with spaces', () => {
    expect(() => new Email('user name@example.com')).toThrow(InvalidEmail);
  });

  it('rejects empty string', () => {
    expect(() => new Email('')).toThrow(InvalidEmail);
  });

  it('equals() returns true for same email regardless of case', () => {
    const a = new Email('foo@bar.com');
    const b = new Email('FOO@BAR.COM');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() returns false for different emails', () => {
    const a = new Email('foo@bar.com');
    const b = new Email('baz@bar.com');
    expect(a.equals(b)).toBe(false);
  });

  it('toString() returns the normalized value', () => {
    const email = new Email('FOO@BAR.COM');
    expect(email.toString()).toBe('foo@bar.com');
  });
});
