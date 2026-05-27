import { NextFunction, Request, Response, Router } from 'express';
import { TokenRefresh } from '../../domain/usecases/TokenRefresh';
import { UserLogin } from '../../domain/usecases/UserLogin';
import { UserRegistration } from '../../domain/usecases/UserRegistration';

export class AuthController {
  public readonly router: Router;

  constructor(
    private readonly registration: UserRegistration,
    private readonly login: UserLogin,
    private readonly tokenRefresh: TokenRefresh,
  ) {
    this.router = Router();
    this.router.post('/register', this.register);
    this.router.post('/login', this.loginHandler);
    this.router.post('/refresh', this.refresh);
  }

  private register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.registration.register({
        email: req.body.email,
        password: req.body.password,
      });
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  private loginHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.login.login({
        email: req.body.email,
        password: req.body.password,
      });
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  private refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await this.tokenRefresh.refresh(req.body.refreshToken);
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  };
}
