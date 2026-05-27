import { randomUUID } from 'node:crypto';
import { AuthResponse } from '../dtos/auth/AuthResponse';
import { RegistrationRequest } from '../dtos/auth/RegistrationRequest';
import { User } from '../entities/User';
import { UserAlreadyExists } from '../exceptions/UserErrors';
import { PasswordGateway } from '../interfaces/gateways/PasswordGateway';
import { TokenGateway } from '../interfaces/gateways/TokenGateway';
import { UserRepository } from '../interfaces/repositories/UserRepository';
import { Email } from '../valueObjects/Email';
import { asPasswordHash } from '../valueObjects/PasswordHash';

export class UserRegistration {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordGateway,
    private readonly tokens: TokenGateway,
  ) {}

  async register(request: RegistrationRequest): Promise<AuthResponse> {
    const email = new Email(request.email);

    if (await this.users.findByEmail(email)) {
      throw new UserAlreadyExists(email.value);
    }

    const hash = await this.passwords.hashPassword(request.password);
    const user = new User(randomUUID(), email, asPasswordHash(hash), new Date());
    await this.users.save(user);

    const tokenPair = await this.tokens.createTokens({ userId: user.id, email: email.value });
    return {
      userId: user.id,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    };
  }
}
