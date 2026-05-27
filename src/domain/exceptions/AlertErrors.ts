import { DomainError } from './DomainError';

export class AlertNotFound extends DomainError {
  readonly code = 'ALERT_NOT_FOUND';

  constructor(id: string) {
    super(`Alert not found: ${id}`);
  }
}

export class InvalidAlertCondition extends DomainError {
  readonly code = 'INVALID_ALERT_CONDITION';

  constructor(reason: string) {
    super(`Invalid alert condition: ${reason}`);
  }
}
