import { NextFunction, Request, Response, Router } from 'express';
import { PriceHistoryQuery } from '../../domain/usecases/PriceHistoryQuery';
import { DateRange } from '../../domain/valueObjects/DateRange';

const DEFAULT_LOOKBACK_DAYS = 30;

export class PriceHistoryController {
  public readonly router: Router;

  constructor(private readonly historyQuery: PriceHistoryQuery) {
    this.router = Router();
    this.router.get('/', this.query);
  }

  private query = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productUrl = String(req.query.productUrl ?? '');
      const days = Number(req.query.days ?? DEFAULT_LOOKBACK_DAYS);
      const range = DateRange.lastDays(days);
      const points = await this.historyQuery.query({ productUrl, range });
      res.status(200).json(points);
    } catch (err) {
      next(err);
    }
  };
}
