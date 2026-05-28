import { InvalidDisplayName } from '../exceptions/UserErrors';

const MIN_LENGTH = 5;
const MAX_LENGTH = 50;
const VALID_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}'_\-\.]*$/u;

export class DisplayName {
  readonly value: string;

  constructor(value: unknown) {
    if (typeof value !== 'string' || value === '') {
      throw new InvalidDisplayName('Display name is required');
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidDisplayName(
        `Display name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`,
      );
    }

    if (!VALID_PATTERN.test(trimmed)) {
      throw new InvalidDisplayName(
        `Display name must start with a letter or number and contain only letters, numbers, or _ - . '`,
      );
    }

    this.value = trimmed;
  }

  toString(): string {
    return this.value;
  }
}
