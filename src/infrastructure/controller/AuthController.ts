import { NextFunction, Request, Response } from 'express';
import { TokenRefresh } from '../../domain/usecases/TokenRefresh';
import { UserLogin } from '../../domain/usecases/UserLogin';
import { UserRegistration } from '../../domain/usecases/UserRegistration';

export class AuthController {
  constructor(
    private readonly registrationUseCase: UserRegistration,
    private readonly loginUseCase: UserLogin,
    private readonly tokenRefreshUseCase: TokenRefresh,
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.registrationUseCase.register({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
      });
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await this.loginUseCase.login({
        email: req.body.email,
        password: req.body.password,
      });
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await this.tokenRefreshUseCase.refresh(req.body.refreshToken);
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  };
}
