import { Router } from 'express';
import { WatchlistController } from '../../infrastructure/controller/WatchlistController';

export function watchlistRoutes(ctrl: WatchlistController): Router {
  const router = Router();
  router.get('/', ctrl.list);
  router.post('/', ctrl.add);
  router.delete('/:id', ctrl.remove);
  return router;
}
