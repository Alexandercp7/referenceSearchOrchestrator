import { InvalidPasswordHash } from '../exceptions/UserErrors';

export { InvalidPasswordHash };

declare const brand: unique symbol;
export type PasswordHash = string & { readonly [brand]: 'PasswordHash' };

export function asPasswordHash(value: string): PasswordHash {
  if (!value || value.length < 20) {
    throw new InvalidPasswordHash('Password hash must be a non-empty string of at least 20 chars');
  }
  return value as PasswordHash;
}
