import { Router } from 'express';
import { PushController } from '../../infrastructure/controller/PushController';

export function pushRoutes(ctrl: PushController): Router {
  const r = Router();
  r.post('/subscribe', ctrl.subscribe);
  r.delete('/subscribe', ctrl.unsubscribe);
  return r;
}
