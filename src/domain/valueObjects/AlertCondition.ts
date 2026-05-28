import { InvalidAlertCondition } from '../exceptions/AlertErrors';
import { Money } from './Money';

export type AlertCondition =
  | { kind: 'PriceBelow'; threshold: Money }
  | { kind: 'PriceAtMin'; lookbackDays: number }
  | { kind: 'PriceDropPct'; percent: number; lookbackDays: number };

export interface ConditionJson {
  kind: string;
  amount?: string;
  currency?: string;
  lookbackDays?: number;
  percent?: number;
}

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

export function conditionText(condition: AlertCondition): string {
  switch (condition.kind) {
    case 'PriceBelow':   return `Precio por debajo de ${condition.threshold.toString()}`;
    case 'PriceAtMin':   return `Mínimo en los últimos ${condition.lookbackDays} días`;
    case 'PriceDropPct': return `Caída de ${condition.percent}% en ${condition.lookbackDays} días`;
  }
}

export function serializeCondition(condition: AlertCondition): ConditionJson {
  switch (condition.kind) {
    case 'PriceBelow':
      return { kind: 'PriceBelow', amount: condition.threshold.amount.toString(), currency: condition.threshold.currency };
    case 'PriceAtMin':
      return { kind: 'PriceAtMin', lookbackDays: condition.lookbackDays };
    case 'PriceDropPct':
      return { kind: 'PriceDropPct', percent: condition.percent, lookbackDays: condition.lookbackDays };
  }
}

export function parseConditionFromJson(json: string): AlertCondition {
  const raw = JSON.parse(json) as ConditionJson;
  if (raw.kind === 'PriceBelow') {
    if (!raw.amount || !raw.currency) {
      throw new InvalidAlertCondition('PriceBelow condition missing amount or currency');
    }
    return { kind: 'PriceBelow', threshold: new Money(raw.amount, raw.currency) };
  }
  if (raw.kind === 'PriceAtMin') {
    if (!raw.lookbackDays) throw new InvalidAlertCondition('PriceAtMin condition missing lookbackDays');
    return { kind: 'PriceAtMin', lookbackDays: raw.lookbackDays };
  }
  if (raw.kind === 'PriceDropPct') {
    if (!raw.percent || !raw.lookbackDays) throw new InvalidAlertCondition('PriceDropPct condition missing fields');
    return { kind: 'PriceDropPct', percent: raw.percent, lookbackDays: raw.lookbackDays };
  }
  throw new InvalidAlertCondition(`Unknown condition kind: ${raw.kind}`);
}

export function alertConditionFromRequest(input: unknown): AlertCondition {
  if (!input || typeof input !== 'object') {
    throw new InvalidAlertCondition('condition must be an object');
  }
  const c = input as Record<string, unknown>;
  switch (c.kind) {
    case 'PriceBelow': {
      const t = c.threshold as Record<string, unknown> | undefined;
      const amount = String(t?.amount ?? c.amount);
      const currency = String(t?.currency ?? c.currency ?? 'MXN');
      return priceBelow(new Money(amount, currency));
    }
    case 'PriceAtMin':
      return priceAtMin(Number(c.lookbackDays));
    case 'PriceDropPct':
      return priceDropPct(Number(c.percent), Number(c.lookbackDays ?? 30));
    default:
      throw new InvalidAlertCondition(`unknown kind: ${String(c.kind)}`);
  }
}
