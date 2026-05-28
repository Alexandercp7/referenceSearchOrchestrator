import { beforeEach, describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { AlertRepository } from '../../../src/domain/interfaces/repositories/AlertRepository';
import { AlertCreation } from '../../../src/domain/usecases/AlertCreation';
import { IdGenerator } from '../../../src/domain/interfaces/gateways/IdGenerator';
import { priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeIds implements IdGenerator {
  private n = 0;
  generate(): string { return `id-${++this.n}`; }
}

class FakeAlertRepo implements AlertRepository {
  readonly saved: Alert[] = [];

  async findById(id: string): Promise<Alert | null> {
    return this.saved.find((a) => a.id === id) ?? null;
  }
  async findActive(): Promise<Alert[]> { return this.saved.filter((a) => a.active); }
  async findByUser(userId: string): Promise<Alert[]> {
    return this.saved.filter((a) => a.userId === userId);
  }
  async save(alert: Alert): Promise<void> { this.saved.push(alert); }
  async remove(): Promise<void> {}
}

describe('AlertCreation', () => {
  const condition = priceBelow(new Money(500, 'MXN'));
  let repo: FakeAlertRepo;
  let useCase: AlertCreation;

  beforeEach(() => {
    repo = new FakeAlertRepo();
    useCase = new AlertCreation(repo, new FakeIds());
  });

  it('creates an alert that is active with no lastTriggeredAt', async () => {
    const alert = await useCase.create({
      userId: 'user-1',
      productUrl: 'https://example.com/product',
      condition,
    });
    expect(alert.active).toBe(true);
    expect(alert.lastTriggeredAt).toBeNull();
    expect(alert.userId).toBe('user-1');
    expect(alert.productUrl).toBe('https://example.com/product');
  });

  it('persists the alert in the repository', async () => {
    await useCase.create({ userId: 'user-1', productUrl: 'https://example.com', condition });
    expect(repo.saved).toHaveLength(1);
  });

  it('generates a unique id for each alert', async () => {
    const a1 = await useCase.create({ userId: 'u', productUrl: 'https://example.com/1', condition });
    const a2 = await useCase.create({ userId: 'u', productUrl: 'https://example.com/2', condition });
    expect(a1.id).not.toBe(a2.id);
  });
});
