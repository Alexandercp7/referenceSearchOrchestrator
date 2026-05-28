import { beforeEach, describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { User } from '../../../src/domain/entities/User';
import { NotificationGateway } from '../../../src/domain/interfaces/gateways/NotificationGateway';
import { AlertRepository } from '../../../src/domain/interfaces/repositories/AlertRepository';
import { PriceHistoryRepository } from '../../../src/domain/interfaces/repositories/PriceHistoryRepository';
import { UserRepository } from '../../../src/domain/interfaces/repositories/UserRepository';
import { AlertConditionEvaluator } from '../../../src/domain/interfaces/services/AlertConditionEvaluator';
import { AlertEvaluation } from '../../../src/domain/usecases/AlertEvaluation';
import { AlertCondition, priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { DateRange } from '../../../src/domain/valueObjects/DateRange';
import { Email } from '../../../src/domain/valueObjects/Email';
import { Money } from '../../../src/domain/valueObjects/Money';
import { asPasswordHash } from '../../../src/domain/valueObjects/PasswordHash';

const MXN = (n: number) => new Money(n, 'MXN');
const snap = (amount: number) =>
  new PriceSnapshot('s1', 'https://example.com', 'amazon', MXN(amount), new Date());
const cond = priceBelow(MXN(600));

class FakeAlertRepo implements AlertRepository {
  constructor(private active: Alert[]) {}
  readonly saved: Alert[] = [];
  async findById(id: string): Promise<Alert | null> {
    return this.active.find((a) => a.id === id) ?? null;
  }
  async findActive(): Promise<Alert[]> { return this.active; }
  async findByUser(): Promise<Alert[]> { return []; }
  async save(alert: Alert): Promise<void> { this.saved.push(alert); }
  async remove(): Promise<void> {}
}

class FakeHistory implements PriceHistoryRepository {
  constructor(private latest: PriceSnapshot | null) {}
  async saveSnapshot(): Promise<void> {}
  async getHistory(): Promise<PriceSnapshot[]> { return []; }
  async getLatest(): Promise<PriceSnapshot | null> { return this.latest; }
  async getMin(_url: string, _range: DateRange): Promise<Money | null> { return null; }
}

class FakeUsers implements UserRepository {
  constructor(private user: User | null) {}
  async findById(): Promise<User | null> { return this.user; }
  async findByEmail(): Promise<User | null> { return null; }
  async save(): Promise<void> {}
}

class FakeNotifier implements NotificationGateway {
  readonly calls: Array<{ user: User; alert: Alert; snapshot: PriceSnapshot }> = [];
  async notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void> {
    this.calls.push({ user, alert, snapshot });
  }
}

class AlwaysMatch implements AlertConditionEvaluator {
  readonly kind = 'PriceBelow' as const;
  async matches(): Promise<boolean> { return true; }
}

class NeverMatch implements AlertConditionEvaluator {
  readonly kind = 'PriceBelow' as const;
  async matches(): Promise<boolean> { return false; }
}

function makeUser(): User {
  return new User(
    'user-1',
    new Email('user@example.com'),
    asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa'),
    new Date(),
  );
}

const alert = new Alert('a1', 'user-1', 'https://example.com', cond, true, null);
const evaluators = (ev: AlertConditionEvaluator) =>
  new Map<AlertCondition['kind'], AlertConditionEvaluator>([['PriceBelow', ev]]);

describe('AlertEvaluation', () => {
  let notifier: FakeNotifier;

  beforeEach(() => {
    notifier = new FakeNotifier();
  });

  it('notifies user and triggers alert when condition matches', async () => {
    const alertRepo = new FakeAlertRepo([alert]);
    const useCase = new AlertEvaluation(
      alertRepo,
      new FakeHistory(snap(400)),
      new FakeUsers(makeUser()),
      notifier,
      evaluators(new AlwaysMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(1);
    expect(alertRepo.saved[0]?.lastTriggeredAt).not.toBeNull();
  });

  it('does not notify when condition does not match', async () => {
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert]),
      new FakeHistory(snap(700)),
      new FakeUsers(makeUser()),
      notifier,
      evaluators(new NeverMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(0);
  });

  it('skips alert when no latest snapshot exists', async () => {
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert]),
      new FakeHistory(null),
      new FakeUsers(makeUser()),
      notifier,
      evaluators(new AlwaysMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(0);
  });

  it('skips alert when user is not found', async () => {
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert]),
      new FakeHistory(snap(400)),
      new FakeUsers(null),
      notifier,
      evaluators(new AlwaysMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(0);
  });

  it('continues evaluating other alerts when one throws', async () => {
    const alert2 = new Alert('a2', 'user-1', 'https://example.com/2', cond, true, null);
    let callCount = 0;
    const faultyNotifier: NotificationGateway = {
      async notify() {
        callCount++;
        if (callCount === 1) throw new Error('notification failed');
      },
    };
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert, alert2]),
      new FakeHistory(snap(400)),
      new FakeUsers(makeUser()),
      faultyNotifier,
      evaluators(new AlwaysMatch()),
    );
    await expect(useCase.evaluate()).resolves.not.toThrow();
    expect(callCount).toBe(2);
  });
});
