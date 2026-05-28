import { beforeEach, describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { AlertRepository } from '../../../src/domain/interfaces/repositories/AlertRepository';
import { AlertListing } from '../../../src/domain/usecases/AlertListing';
import { priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { Money } from '../../../src/domain/valueObjects/Money';

class FakeAlertRepo implements AlertRepository {
  private store: Alert[] = [];

  seed(alert: Alert): void { this.store.push(alert); }
  async findById(id: string): Promise<Alert | null> {
    return this.store.find((a) => a.id === id) ?? null;
  }
  async findActive(): Promise<Alert[]> { return this.store.filter((a) => a.active); }
  async findByUser(userId: string): Promise<Alert[]> {
    return this.store.filter((a) => a.userId === userId);
  }
  async save(alert: Alert): Promise<void> { this.store.push(alert); }
  async remove(): Promise<void> {}
}

const cond = priceBelow(new Money(500, 'MXN'));

describe('AlertListing', () => {
  let repo: FakeAlertRepo;
  let useCase: AlertListing;

  beforeEach(() => {
    repo = new FakeAlertRepo();
    useCase = new AlertListing(repo);
  });

  it('returns AlertViews for the given user', async () => {
    repo.seed(new Alert('a1', 'user-1', 'https://example.com/1', cond, true, null));
    repo.seed(new Alert('a2', 'user-1', 'https://example.com/2', cond, false, null));
    repo.seed(new Alert('a3', 'user-2', 'https://example.com/3', cond, true, null));

    const views = await useCase.list('user-1');

    expect(views).toHaveLength(2);
    expect(views.map((v) => v.id)).toContain('a1');
    expect(views.map((v) => v.id)).toContain('a2');
  });

  it('returns empty array when user has no alerts', async () => {
    expect(await useCase.list('user-1')).toHaveLength(0);
  });

  it('maps Alert fields to AlertView correctly', async () => {
    const triggeredAt = new Date('2024-01-01');
    repo.seed(new Alert('a1', 'user-1', 'https://example.com', cond, true, triggeredAt));

    const [view] = await useCase.list('user-1');

    expect(view).toMatchObject({
      id: 'a1',
      productUrl: 'https://example.com',
      condition: cond,
      active: true,
      lastTriggeredAt: triggeredAt,
    });
  });
});
