import bcrypt from 'bcryptjs';
import { PasswordGateway } from '../../domain/interfaces/gateways/PasswordGateway';

export class BcryptPasswordGateway implements PasswordGateway {
  constructor(private readonly rounds: number = 12) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
