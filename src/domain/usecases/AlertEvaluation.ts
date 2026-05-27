import { Alert } from '../entities/Alert';
import { PriceSnapshot } from '../entities/PriceSnapshot';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { UserRepository } from '../interfaces/repositories/UserRepository';
import { NotificationGateway } from '../interfaces/gateways/NotificationGateway';
import { AlertConditionEvaluator } from '../interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../valueObjects/AlertCondition';

export class AlertEvaluation {
  constructor(
    private readonly alerts: AlertRepository,
    private readonly history: PriceHistoryRepository,
    private readonly users: UserRepository,
    private readonly notifier: NotificationGateway,
    private readonly evaluators: Map<AlertCondition['kind'], AlertConditionEvaluator>,
  ) {}

  async evaluate(): Promise<void> {
    const active = await this.alerts.findActive();
    await Promise.allSettled(active.map((alert) => this.evaluateAlert(alert)));
  }

  private async evaluateAlert(alert: Alert): Promise<void> {
    const latest = await this.history.getLatest(alert.productUrl);
    if (!latest) return;

    if (!(await this.conditionMatches(alert.condition, latest))) return;

    const user = await this.users.findById(alert.userId);
    if (!user) return;

    await this.notifier.notify(user, alert, latest);
    await this.alerts.save(alert.trigger(new Date()));
  }

  private async conditionMatches(
    condition: AlertCondition,
    snapshot: PriceSnapshot,
  ): Promise<boolean> {
    const evaluator = this.evaluators.get(condition.kind);
    if (!evaluator) return false;
    return evaluator.matches(condition, snapshot, this.history);
  }
}
