import { NextFunction, Request, Response, Router } from 'express';
import { ProductSearch } from '../../domain/usecases/ProductSearch';
import { SearchWeights } from '../../domain/valueObjects/SearchWeights';

export class SearchController {
  public readonly router: Router;

  constructor(private readonly productSearch: ProductSearch) {
    this.router = Router();
    this.router.post('/', this.search);
  }

  private search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const w = req.body.weights ?? {};
      const weights = new SearchWeights(
        w.price ?? 0.25,
        w.stock ?? 0.25,
        w.delivery ?? 0.25,
        w.msi ?? 0.25,
      );
      const response = await this.productSearch.search({ query: req.body.query, weights });
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };
}
