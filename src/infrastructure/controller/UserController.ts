import { NextFunction, Request, Response } from 'express';
import { UpdateUserPreferences } from '../../domain/usecases/UpdateUserPreferences';

export class UserController {
  constructor(private readonly updatePreferences: UpdateUserPreferences) {}

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.updatePreferences.update({ userId: req.userId!, name: req.body.name });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
