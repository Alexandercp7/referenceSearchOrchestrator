import jwt, { SignOptions } from 'jsonwebtoken';
import { InvalidToken } from '../../domain/exceptions/UserErrors';
import { TokenGateway, TokenPair, TokenPayload } from '../../domain/interfaces/gateways/TokenGateway';

export interface JwtConfig {
  secret: string;
  accessTtl?: string;
  refreshTtl?: string;
}

export class JwtTokenGateway implements TokenGateway {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(private readonly config: JwtConfig) {
    this.accessTtl = config.accessTtl ?? '15m';
    this.refreshTtl = config.refreshTtl ?? '7d';
  }

  async createTokens(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = jwt.sign(payload, this.config.secret, {
      expiresIn: this.accessTtl as SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, this.config.secret, {
      expiresIn: this.refreshTtl as SignOptions['expiresIn'],
    });
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.config.secret) as jwt.JwtPayload & TokenPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      throw new InvalidToken();
    }
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.secret) as jwt.JwtPayload &
        TokenPayload & { type?: string };
      if (decoded.type !== 'refresh') throw new InvalidToken();
      return this.createTokens({ userId: decoded.userId, email: decoded.email });
    } catch {
      throw new InvalidToken();
    }
  }
}
