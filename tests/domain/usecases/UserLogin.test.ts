import { beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../../src/domain/entities/User';
import { InvalidCredentials } from '../../../src/domain/exceptions/UserErrors';
import { PasswordGateway } from '../../../src/domain/interfaces/gateways/PasswordGateway';
import { TokenGateway, TokenPair, TokenPayload } from '../../../src/domain/interfaces/gateways/TokenGateway';
import { UserRepository } from '../../../src/domain/interfaces/repositories/UserRepository';
import { UserLogin } from '../../../src/domain/usecases/UserLogin';
import { Email } from '../../../src/domain/valueObjects/Email';
import { asPasswordHash } from '../../../src/domain/valueObjects/PasswordHash';

function makeUser(emailStr: string): User {
  return new User(
    'user-1',
    new Email(emailStr),
    asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa'),
    new Date(),
  );
}

class FakeUserRepo implements UserRepository {
  private users: User[] = [];

  seed(user: User): void { this.users.push(user); }
  async findById(): Promise<User | null> { return null; }
  async findByEmail(email: Email): Promise<User | null> {
    return this.users.find((u) => u.email.equals(email)) ?? null;
  }
  async save(user: User): Promise<void> { this.users.push(user); }
}

class FakePasswords implements PasswordGateway {
  constructor(private valid: boolean) {}
  async hashPassword(plain: string): Promise<string> { return `hashed-${plain}-padding-padding`; }
  async verifyPassword(): Promise<boolean> { return this.valid; }
}

class FakeTokens implements TokenGateway {
  async createTokens(payload: TokenPayload): Promise<TokenPair> {
    return { accessToken: `at-${payload.userId}`, refreshToken: `rt-${payload.userId}` };
  }
  async verifyAccessToken(): Promise<TokenPayload> { return { userId: 'x', email: 'x@x.com' }; }
  async refresh(): Promise<TokenPair> { return { accessToken: 'a', refreshToken: 'r' }; }
}

describe('UserLogin', () => {
  let users: FakeUserRepo;

  beforeEach(() => {
    users = new FakeUserRepo();
  });

  it('returns tokens and userId for valid credentials', async () => {
    users.seed(makeUser('foo@example.com'));
    const useCase = new UserLogin(users, new FakePasswords(true), new FakeTokens());
    const response = await useCase.login({ email: 'foo@example.com', password: 'secret' });
    expect(response.userId).toBe('user-1');
    expect(response.accessToken).toContain('at-');
    expect(response.refreshToken).toContain('rt-');
  });

  it('throws InvalidCredentials when user is not found', async () => {
    const useCase = new UserLogin(users, new FakePasswords(true), new FakeTokens());
    await expect(
      useCase.login({ email: 'nobody@example.com', password: 'secret' }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
  });

  it('throws InvalidCredentials when password is wrong', async () => {
    users.seed(makeUser('foo@example.com'));
    const useCase = new UserLogin(users, new FakePasswords(false), new FakeTokens());
    await expect(
      useCase.login({ email: 'foo@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
  });

  it('same error for missing user and wrong password (no leaking)', async () => {
    users.seed(makeUser('real@example.com'));
    const wrongUser = new UserLogin(users, new FakePasswords(true), new FakeTokens());
    const wrongPass = new UserLogin(users, new FakePasswords(false), new FakeTokens());

    const errA = await wrongUser
      .login({ email: 'fake@example.com', password: 'x' })
      .catch((e) => e);
    const errB = await wrongPass
      .login({ email: 'real@example.com', password: 'x' })
      .catch((e) => e);

    expect(errA).toBeInstanceOf(InvalidCredentials);
    expect(errB).toBeInstanceOf(InvalidCredentials);
    expect(errA.message).toBe(errB.message);
  });
});
