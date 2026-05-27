import { InvalidAlertCondition } from '../exceptions/AlertErrors';
import { Money } from './Money';

export type AlertCondition =
  | { kind: 'PriceBelow'; threshold: Money }
  | { kind: 'PriceAtMin'; lookbackDays: number }
  | { kind: 'PriceDropPct'; percent: number; lookbackDays: number };

export function priceBelow(threshold: Money): AlertCondition {
  return { kind: 'PriceBelow', threshold };
}

export function priceAtMin(lookbackDays: number): AlertCondition {
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
    throw new InvalidAlertCondition(`lookbackDays must be a positive integer, got ${lookbackDays}`);
  }
  return { kind: 'PriceAtMin', lookbackDays };
}

export function priceDropPct(percent: number, lookbackDays: number): AlertCondition {
  if (Number.isNaN(percent) || percent <= 0 || percent > 100) {
    throw new InvalidAlertCondition(`percent must be in (0, 100], got ${percent}`);
  }
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
    throw new InvalidAlertCondition(`lookbackDays must be a positive integer, got ${lookbackDays}`);
  }
  return { kind: 'PriceDropPct', percent, lookbackDays };
}
