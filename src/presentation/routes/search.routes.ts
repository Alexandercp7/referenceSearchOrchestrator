import { Router } from 'express';
import { SearchController } from '../../infrastructure/controller/SearchController';

export function searchRoutes(ctrl: SearchController): Router {
  const router = Router();
  router.get('/', ctrl.search);
  return router;
}
