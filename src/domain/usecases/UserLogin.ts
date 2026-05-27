import { AuthResponse } from '../dtos/auth/AuthResponse';
import { LoginRequest } from '../dtos/auth/LoginRequest';
import { InvalidCredentials } from '../exceptions/UserErrors';
import { PasswordGateway } from '../interfaces/gateways/PasswordGateway';
import { TokenGateway } from '../interfaces/gateways/TokenGateway';
import { UserRepository } from '../interfaces/repositories/UserRepository';
import { Email } from '../valueObjects/Email';

export class UserLogin {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordGateway,
    private readonly tokens: TokenGateway,
  ) {}

  async login(request: LoginRequest): Promise<AuthResponse> {
    const email = new Email(request.email);
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new InvalidCredentials();
    }

    const valid = await this.passwords.verifyPassword(request.password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentials();
    }

    const tokenPair = await this.tokens.createTokens({ userId: user.id, email: email.value });
    return {
      userId: user.id,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    };
  }
}
