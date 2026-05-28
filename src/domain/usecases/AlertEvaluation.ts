import { Alert } from '../entities/Alert';
import { PriceSnapshot } from '../entities/PriceSnapshot';
import { User } from '../entities/User';
import { AlertRepository } from '../interfaces/repositories/AlertRepository';
import { PriceHistoryRepository } from '../interfaces/repositories/PriceHistoryRepository';
import { UserRepository } from '../interfaces/repositories/UserRepository';
import { NotificationGateway, TriggeredAlert } from '../interfaces/gateways/NotificationGateway';
import { AlertConditionEvaluator } from '../interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../valueObjects/AlertCondition';

type EvaluatedAlert = { user: User; alert: Alert; snapshot: PriceSnapshot };

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
    const results = await Promise.allSettled(active.map((a) => this.evaluateAlert(a)));

    const byUser = new Map<string, { user: User; items: TriggeredAlert[] }>();
    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const { user, alert, snapshot } = r.value;
      if (!byUser.has(user.id)) byUser.set(user.id, { user, items: [] });
      byUser.get(user.id)!.items.push({ alert, snapshot });
    }

    await Promise.allSettled(
      [...byUser.values()].map(({ user, items }) => this.notifier.notify(user, items)),
    );
  }

  private async evaluateAlert(alert: Alert): Promise<EvaluatedAlert | null> {
    const latest = await this.history.getLatest(alert.productUrl);
    if (!latest) return null;

    if (!(await this.conditionMatches(alert.condition, latest))) return null;

    const user = await this.users.findById(alert.userId);
    if (!user) return null;

    await this.alerts.save(alert.trigger(new Date()));
    return { user, alert, snapshot: latest };
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
