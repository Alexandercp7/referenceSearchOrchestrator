import { TokenGateway, TokenPair } from '../interfaces/gateways/TokenGateway';

export class TokenRefresh {
  constructor(private readonly tokens: TokenGateway) {}

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokens.refresh(refreshToken);
  }
}
