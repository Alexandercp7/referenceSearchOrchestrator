import { DomainError } from './DomainError';

export class InvalidMoney extends DomainError {
  readonly code = 'INVALID_MONEY';
}
