import { NextFunction, Request, Response } from 'express';
import { ProductSearch } from '../../domain/usecases/ProductSearch';
import { SearchWeights } from '../../domain/valueObjects/SearchWeights';

export class SearchController {
  constructor(private readonly productSearch: ProductSearch) {}

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const price = Number(req.query.price ?? 0.25);
      const stock = Number(req.query.stock ?? 0.25);
      const delivery = Number(req.query.delivery ?? 0.25);
      const msi = Number(req.query.msi ?? 0.25);
      const weights = new SearchWeights(price, stock, delivery, msi);
      const response = await this.productSearch.search({
        query: String(req.query.q ?? ''),
        weights,
      });
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}
