import { Alert } from '../../../domain/entities/Alert';
import { AlertCondition } from '../../../domain/valueObjects/AlertCondition';
import { Money } from '../../../domain/valueObjects/Money';

export interface AlertRow {
  id: string;
  user_id: string;
  product_url: string;
  condition_json: string;
  active: number | boolean;
  last_triggered_at: Date | null;
}

interface ConditionJson {
  kind: string;
  amount?: string;
  currency?: string;
  lookbackDays?: number;
  percent?: number;
}

export class AlertMapper {
  static toDomain(row: AlertRow): Alert {
    return new Alert(
      row.id,
      row.user_id,
      row.product_url,
      AlertMapper.parseCondition(row.condition_json),
      Boolean(row.active),
      row.last_triggered_at,
    );
  }

  static toRow(alert: Alert): AlertRow {
    return {
      id: alert.id,
      user_id: alert.userId,
      product_url: alert.productUrl,
      condition_json: JSON.stringify(AlertMapper.serializeCondition(alert.condition)),
      active: alert.active ? 1 : 0,
      last_triggered_at: alert.lastTriggeredAt,
    };
  }

  private static serializeCondition(condition: AlertCondition): ConditionJson {
    if (condition.kind === 'PriceBelow') {
      return {
        kind: 'PriceBelow',
        amount: condition.threshold.amount.toString(),
        currency: condition.threshold.currency,
      };
    }
    return condition;
  }

  private static parseCondition(json: string): AlertCondition {
    const raw = JSON.parse(json) as ConditionJson;
    if (raw.kind === 'PriceBelow') {
      return { kind: 'PriceBelow', threshold: new Money(raw.amount!, raw.currency!) };
    }
    if (raw.kind === 'PriceAtMin') {
      return { kind: 'PriceAtMin', lookbackDays: raw.lookbackDays! };
    }
    if (raw.kind === 'PriceDropPct') {
      return { kind: 'PriceDropPct', percent: raw.percent!, lookbackDays: raw.lookbackDays! };
    }
    throw new Error(`Unknown AlertCondition kind: ${raw.kind}`);
  }
}
