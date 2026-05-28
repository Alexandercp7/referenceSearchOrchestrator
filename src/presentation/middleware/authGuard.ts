import { NextFunction, Request, Response } from 'express';
import { TokenGateway } from '../../domain/interfaces/gateways/TokenGateway';

export function authGuard(tokens: TokenGateway) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Missing bearer token' } });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = await tokens.verifyAccessToken(token);
      req.userId = payload.userId;
      next();
    } catch {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalid' } });
    }
  };
}
