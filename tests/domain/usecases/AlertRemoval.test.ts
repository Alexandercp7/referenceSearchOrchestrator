import { beforeEach, describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { AlertNotFound } from '../../../src/domain/exceptions/AlertErrors';
import { AlertRepository } from '../../../src/domain/interfaces/repositories/AlertRepository';
import { AlertRemoval } from '../../../src/domain/usecases/AlertRemoval';
import { priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeAlertRepo implements AlertRepository {
  private store = new Map<string, Alert>();
  readonly removed: string[] = [];

  seed(alert: Alert): void { this.store.set(alert.id, alert); }
  async findById(id: string): Promise<Alert | null> { return this.store.get(id) ?? null; }
  async findActive(): Promise<Alert[]> {
    return [...this.store.values()].filter((a) => a.active);
  }
  async findByUser(userId: string): Promise<Alert[]> {
    return [...this.store.values()].filter((a) => a.userId === userId);
  }
  async save(alert: Alert): Promise<void> { this.store.set(alert.id, alert); }
  async remove(id: string): Promise<void> { this.store.delete(id); this.removed.push(id); }
}

describe('AlertRemoval', () => {
  const cond = priceBelow(new Money(500, 'MXN'));
  let repo: FakeAlertRepo;
  let useCase: AlertRemoval;

  beforeEach(() => {
    repo = new FakeAlertRepo();
    useCase = new AlertRemoval(repo);
  });

  it('removes an existing alert', async () => {
    repo.seed(new Alert('a1', 'user-1', 'https://example.com', cond, true, null));
    await useCase.remove('a1');
    expect(repo.removed).toContain('a1');
  });

  it('throws AlertNotFound when alert does not exist', async () => {
    await expect(useCase.remove('nonexistent')).rejects.toBeInstanceOf(AlertNotFound);
  });
});
