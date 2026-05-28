import { DisplayName } from '../valueObjects/DisplayName';
import { Email } from '../valueObjects/Email';
import { PasswordHash } from '../valueObjects/PasswordHash';

export class User {
  readonly id: string;
  readonly email: Email;
  readonly passwordHash: PasswordHash;
  readonly createdAt: Date;
  readonly displayName: DisplayName;

  constructor(
    id: string,
    email: Email,
    passwordHash: PasswordHash,
    createdAt: Date,
    displayName: DisplayName,
  ) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.displayName = displayName;
  }

  withDisplayName(displayName: DisplayName): User {
    return new User(this.id, this.email, this.passwordHash, this.createdAt, displayName);
  }
}
