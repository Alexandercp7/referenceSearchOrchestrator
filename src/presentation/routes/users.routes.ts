import { Router } from 'express';
import { UserController } from '../../infrastructure/controller/UserController';

export function usersRoutes(ctrl: UserController): Router {
  const router = Router();
  router.patch('/me', ctrl.update);
  return router;
}
