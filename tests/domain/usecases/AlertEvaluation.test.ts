import { beforeEach, describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { User } from '../../../src/domain/entities/User';
import { NotificationGateway, TriggeredAlert } from '../../../src/domain/interfaces/gateways/NotificationGateway';
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
  new PriceSnapshot('s1', 'https://example.com', 'amazon', 'Monitor', MXN(amount), new Date());
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
  readonly calls: Array<{ user: User; items: TriggeredAlert[] }> = [];
  async notify(user: User, items: TriggeredAlert[]): Promise<void> {
    this.calls.push({ user, items });
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

function makeUser(id = 'user-1', email = 'user@example.com'): User {
  return new User(id, new Email(email), asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa'), new Date());
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
    expect(notifier.calls[0]!.items).toHaveLength(1);
    expect(alertRepo.saved[0]?.lastTriggeredAt).not.toBeNull();
  });

  it('batches multiple alerts for the same user into one notify call', async () => {
    const alert2 = new Alert('a2', 'user-1', 'https://example.com/2', cond, true, null);
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert, alert2]),
      new FakeHistory(snap(400)),
      new FakeUsers(makeUser()),
      notifier,
      evaluators(new AlwaysMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0]!.items).toHaveLength(2);
  });

  it('sends separate notify calls for different users', async () => {
    const alert2 = new Alert('a2', 'user-2', 'https://example.com/2', cond, true, null);
    const multiUsers: UserRepository = {
      async findById(id) {
        if (id === 'user-1') return makeUser('user-1', 'u1@example.com');
        if (id === 'user-2') return makeUser('user-2', 'u2@example.com');
        return null;
      },
      async findByEmail() { return null; },
      async save() {},
    };
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert, alert2]),
      new FakeHistory(snap(400)),
      multiUsers,
      notifier,
      evaluators(new AlwaysMatch()),
    );
    await useCase.evaluate();
    expect(notifier.calls).toHaveLength(2);
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

  it('continues notifying other users when one notify call throws', async () => {
    const alert2 = new Alert('a2', 'user-2', 'https://example.com/2', cond, true, null);
    let callCount = 0;
    const faultyNotifier: NotificationGateway = {
      async notify() {
        callCount++;
        if (callCount === 1) throw new Error('notification failed');
      },
    };
    const multiUsers: UserRepository = {
      async findById(id) {
        if (id === 'user-1') return makeUser('user-1', 'u1@example.com');
        if (id === 'user-2') return makeUser('user-2', 'u2@example.com');
        return null;
      },
      async findByEmail() { return null; },
      async save() {},
    };
    const useCase = new AlertEvaluation(
      new FakeAlertRepo([alert, alert2]),
      new FakeHistory(snap(400)),
      multiUsers,
      faultyNotifier,
      evaluators(new AlwaysMatch()),
    );
    await expect(useCase.evaluate()).resolves.not.toThrow();
    expect(callCount).toBe(2);
  });
});
