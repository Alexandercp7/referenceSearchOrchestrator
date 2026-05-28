import { describe, expect, it } from 'vitest';
import { TokenGateway, TokenPair, TokenPayload } from '../../../src/domain/interfaces/gateways/TokenGateway';
import { TokenRefresh } from '../../../src/domain/usecases/TokenRefresh';

class FakeTokens implements TokenGateway {
  async createTokens(): Promise<TokenPair> { return { accessToken: 'a', refreshToken: 'r' }; }
  async verifyAccessToken(): Promise<TokenPayload> { return { userId: 'x', email: 'x@x.com' }; }
  async refresh(token: string): Promise<TokenPair> {
    return { accessToken: `new-at-${token}`, refreshToken: `new-rt-${token}` };
  }
}

describe('TokenRefresh', () => {
  it('delegates to the token gateway and returns the new token pair', async () => {
    const useCase = new TokenRefresh(new FakeTokens());
    const result = await useCase.refresh('my-refresh-token');
    expect(result.accessToken).toBe('new-at-my-refresh-token');
    expect(result.refreshToken).toBe('new-rt-my-refresh-token');
  });
});
