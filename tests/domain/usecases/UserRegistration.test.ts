import { beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../../src/domain/entities/User';
import { UserAlreadyExists } from '../../../src/domain/exceptions/UserErrors';
import {
  AuthGateway,
  TokenPair,
  TokenPayload,
} from '../../../src/domain/interfaces/gateways/AuthGateway';
import { UserRepository } from '../../../src/domain/interfaces/repositories/UserRepository';
import { UserRegistration } from '../../../src/domain/usecases/UserRegistration';
import { Email } from '../../../src/domain/valueObjects/Email';

class FakeUserRepo implements UserRepository {
  private byEmail = new Map<string, User>();

  async findById(): Promise<User | null> {
    return null;
  }
  async findByEmail(email: Email): Promise<User | null> {
    return this.byEmail.get(email.value) ?? null;
  }
  async save(user: User): Promise<void> {
    this.byEmail.set(user.email.value, user);
  }
}

class FakeAuth implements AuthGateway {
  async hashPassword(plain: string): Promise<string> {
    return `hashed-${plain}-padding-padding`;
  }
  async verifyPassword(): Promise<boolean> {
    return true;
  }
  async createTokens(payload: TokenPayload): Promise<TokenPair> {
    return { accessToken: `access-${payload.userId}`, refreshToken: `refresh-${payload.userId}` };
  }
  async verifyAccessToken(): Promise<TokenPayload> {
    return { userId: 'x', email: 'x@x.com' };
  }
  async refresh(): Promise<TokenPair> {
    return { accessToken: 'a', refreshToken: 'r' };
  }
}

describe('UserRegistration', () => {
  let users: FakeUserRepo;
  let auth: FakeAuth;
  let registration: UserRegistration;

  beforeEach(() => {
    users = new FakeUserRepo();
    auth = new FakeAuth();
    registration = new UserRegistration(users, auth, auth);
  });

  it('registers a new user and returns tokens', async () => {
    const response = await registration.register({
      email: 'foo@example.com',
      password: 'secret123',
    });
    expect(response.userId).toBeTruthy();
    expect(response.accessToken).toContain('access-');
    expect(response.refreshToken).toContain('refresh-');
  });

  it('fails if the email is already registered', async () => {
    await registration.register({ email: 'foo@example.com', password: 'secret123' });
    await expect(
      registration.register({ email: 'foo@example.com', password: 'other' }),
    ).rejects.toBeInstanceOf(UserAlreadyExists);
  });
});
