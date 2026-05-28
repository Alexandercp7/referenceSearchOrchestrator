import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import {
  AuthGateway,
  TokenPair,
  TokenPayload,
} from '../../domain/interfaces/gateways/AuthGateway';
import { InvalidToken } from '../../domain/exceptions/UserErrors';

export interface JwtConfig {
  secret: string;
  accessTtl: string;
  refreshTtl: string;
  bcryptRounds: number;
}

export class JwtBcryptAuthGateway implements AuthGateway {
  constructor(private readonly config: JwtConfig) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.config.bcryptRounds);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async createTokens(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.accessTtl as SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, this.config.secret, {
      expiresIn: this.config.refreshTtl as SignOptions['expiresIn'],
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
      if (decoded.type !== 'refresh') {
        throw new InvalidToken();
      }
      return this.createTokens({ userId: decoded.userId, email: decoded.email });
    } catch {
      throw new InvalidToken();
    }
  }
}
