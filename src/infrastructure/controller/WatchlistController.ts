import { NextFunction, Request, Response } from 'express';
import { WatchlistAddition } from '../../domain/usecases/WatchlistAddition';
import { WatchlistRemoval } from '../../domain/usecases/WatchlistRemoval';
import { WatchlistView } from '../../domain/usecases/WatchlistView';

export class WatchlistController {
  constructor(
    private readonly addition: WatchlistAddition,
    private readonly removal: WatchlistRemoval,
    private readonly view: WatchlistView,
  ) {}

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = await this.addition.add({
        userId: req.userId!,
        productUrl: req.body.productUrl,
        store: req.body.store,
      });
      res.status(201).json(item);
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
      const items = await this.view.list(req.userId!);
      res.status(200).json(items);
    } catch (err) {
      next(err);
    }
  };
}
