import { Router } from 'express';
import { PriceHistoryController } from '../../infrastructure/controller/PriceHistoryController';

export function priceHistoryRoutes(ctrl: PriceHistoryController): Router {
  const router = Router();
  router.get('/', ctrl.query);
  return router;
}
