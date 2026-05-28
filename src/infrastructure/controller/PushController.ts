import { NextFunction, Request, Response } from 'express';
import { PushSubscriptionAddition } from '../../domain/usecases/PushSubscriptionAddition';
import { PushSubscriptionRemoval } from '../../domain/usecases/PushSubscriptionRemoval';

export class PushController {
  constructor(
    private readonly addition: PushSubscriptionAddition,
    private readonly removal: PushSubscriptionRemoval,
    private readonly vapidPublicKey: string,
  ) {}

  subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { endpoint, keys } = req.body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await this.addition.subscribe({
        userId: req.userId!,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

  unsubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { endpoint } = req.body as { endpoint: string };
      await this.removal.unsubscribe(req.userId!, endpoint);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getVapidPublicKey = (_req: Request, res: Response): void => {
    res.json({ publicKey: this.vapidPublicKey });
  };
}
