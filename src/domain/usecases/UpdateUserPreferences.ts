import { UserNotFound } from '../exceptions/UserErrors';
import { UserRepository } from '../interfaces/repositories/UserRepository';
import { DisplayName } from '../valueObjects/DisplayName';

export interface UpdatePreferencesRequest {
  userId: string;
  name: string;
}

export class UpdateUserPreferences {
  constructor(private readonly users: UserRepository) {}

  async update(request: UpdatePreferencesRequest): Promise<void> {
    const user = await this.users.findById(request.userId);
    if (!user) throw new UserNotFound(request.userId);

    await this.users.save(user.withDisplayName(new DisplayName(request.name)));
  }
}
