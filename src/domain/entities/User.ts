import { Email } from '../valueObjects/Email';
import { PasswordHash } from '../valueObjects/PasswordHash';

export class User {
  readonly id: string;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
  readonly createdAt: Date;

  constructor(id: string, email: Email, passwordHash: PasswordHash, createdAt: Date) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
  }
}
