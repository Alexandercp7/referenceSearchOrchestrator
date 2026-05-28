import { NextFunction, Request, Response } from 'express';
import { AlertCreation } from '../../domain/usecases/AlertCreation';
import { AlertListing } from '../../domain/usecases/AlertListing';
import { AlertRemoval } from '../../domain/usecases/AlertRemoval';
import {
  AlertCondition,
  priceAtMin,
  priceBelow,
  priceDropPct,
} from '../../domain/valueObjects/AlertCondition';
import { InvalidAlertCondition } from '../../domain/exceptions/AlertErrors';
import { Money } from '../../domain/valueObjects/Money';

export class AlertController {
  constructor(
    private readonly creation: AlertCreation,
    private readonly removal: AlertRemoval,
    private readonly listing: AlertListing,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const condition = this.parseCondition(req.body.condition);
      const alert = await this.creation.create({
        userId: req.userId!,
        productUrl: req.body.productUrl,
        condition,
      });
      res.status(201).json(alert);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.removal.remove(req.params.id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alerts = await this.listing.list(req.userId!);
      res.status(200).json(alerts);
    } catch (err) {
      next(err);
    }
  };

  private parseCondition(input: unknown): AlertCondition {
    if (!input || typeof input !== 'object') {
      throw new InvalidAlertCondition('condition must be an object');
    }
    const c = input as Record<string, unknown>;
    switch (c.kind) {
      case 'PriceBelow': {
        const t = c.threshold as Record<string, unknown> | undefined;
        const amount = String(t?.amount ?? c.amount);
        const currency = String(t?.currency ?? c.currency ?? 'MXN');
        return priceBelow(new Money(amount, currency));
      }
      case 'PriceAtMin':
        return priceAtMin(Number(c.lookbackDays));
      case 'PriceDropPct':
        return priceDropPct(Number(c.percent), Number(c.lookbackDays ?? 30));
      default:
        throw new InvalidAlertCondition(`unknown kind: ${String(c.kind)}`);
    }
  }
}
