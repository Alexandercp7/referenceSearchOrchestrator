import { Alert } from '../../../domain/entities/Alert';
import { parseConditionFromJson, serializeCondition } from '../../../domain/valueObjects/AlertCondition';

export interface AlertRow {
  id: string;
  user_id: string;
  product_url: string;
  condition_json: string;
  active: number | boolean;
  last_triggered_at: Date | null;
}

export class AlertMapper {
  static toDomain(row: AlertRow): Alert {
    return new Alert(
      row.id,
      row.user_id,
      row.product_url,
      parseConditionFromJson(row.condition_json),
      Boolean(row.active),
      row.last_triggered_at,
    );
  }

  static toRow(alert: Alert): AlertRow {
    return {
      id: alert.id,
      user_id: alert.userId,
      product_url: alert.productUrl,
      condition_json: JSON.stringify(serializeCondition(alert.condition)),
      active: alert.active ? 1 : 0,
      last_triggered_at: alert.lastTriggeredAt,
    };
  }
}
