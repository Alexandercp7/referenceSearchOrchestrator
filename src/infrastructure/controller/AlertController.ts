import { NextFunction, Request, Response } from 'express';
import { AlertCreation } from '../../domain/usecases/AlertCreation';
import { AlertListing } from '../../domain/usecases/AlertListing';
import { AlertRemoval } from '../../domain/usecases/AlertRemoval';
import { alertConditionFromRequest } from '../../domain/valueObjects/AlertCondition';

export class AlertController {
  constructor(
    private readonly creation: AlertCreation,
    private readonly removal: AlertRemoval,
    private readonly listing: AlertListing,
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const condition = alertConditionFromRequest(req.body.condition);
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
}
