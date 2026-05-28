import { Router } from 'express';
import { AuthController } from '../../infrastructure/controller/AuthController';

export function authRoutes(ctrl: AuthController): Router {
  const router = Router();
  router.post('/register', ctrl.register);
  router.post('/login', ctrl.login);
  router.post('/refresh', ctrl.refresh);
  return router;
}
