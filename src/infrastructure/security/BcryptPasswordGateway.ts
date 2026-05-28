import bcrypt from 'bcryptjs';
import { PasswordGateway } from '../../domain/interfaces/gateways/PasswordGateway';

const SALT_ROUNDS = 12;

export class BcryptPasswordGateway implements PasswordGateway {
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
