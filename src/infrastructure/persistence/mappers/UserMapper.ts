import { User } from '../../../domain/entities/User';
import { DisplayName } from '../../../domain/valueObjects/DisplayName';
import { Email } from '../../../domain/valueObjects/Email';
import { asPasswordHash } from '../../../domain/valueObjects/PasswordHash';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: Date;
}

export class UserMapper {
  static toDomain(row: UserRow): User {
    return new User(
      row.id,
      new Email(row.email),
      asPasswordHash(row.password_hash),
      row.created_at,
      new DisplayName(row.display_name),
    );
  }

  static toRow(user: User): UserRow {
    return {
      id: user.id,
      email: user.email.value,
      password_hash: user.passwordHash,
      display_name: user.displayName.value,
      created_at: user.createdAt,
    };
  }
}
