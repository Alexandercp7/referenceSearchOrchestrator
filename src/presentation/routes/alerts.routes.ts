import { Router } from 'express';
import { AlertController } from '../../infrastructure/controller/AlertController';

export function alertRoutes(ctrl: AlertController): Router {
  const router = Router();
  router.get('/', ctrl.list);
  router.post('/', ctrl.create);
  router.delete('/:id', ctrl.remove);
  return router;
}
