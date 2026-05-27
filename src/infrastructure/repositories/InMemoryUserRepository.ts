import { User } from '../../domain/entities/User';
import { UserRepository } from '../../domain/interfaces/repositories/UserRepository';
import { Email } from '../../domain/valueObjects/Email';

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byEmail = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.byEmail.get(email.value) ?? null;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.value, user);
  }
}
