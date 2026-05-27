import { DomainError } from './DomainError';

export class InvalidEmail extends DomainError {
  readonly code = 'INVALID_EMAIL';
}

export class InvalidPasswordHash extends DomainError {
  readonly code = 'INVALID_PASSWORD_HASH';
}

export class UserAlreadyExists extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';

  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}

export class UserNotFound extends DomainError {
  readonly code = 'USER_NOT_FOUND';

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class InvalidCredentials extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}

export class InvalidToken extends DomainError {
  readonly code = 'INVALID_TOKEN';

  constructor() {
    super('Token is invalid or expired');
  }
}
