import { DomainError } from './DomainError';

export class InvalidDateRange extends DomainError {
  readonly code = 'INVALID_DATE_RANGE';
}
