import { describe, expect, it } from 'vitest';
import { Alert } from '../../../src/domain/entities/Alert';
import { InvalidProductUrl } from '../../../src/domain/exceptions/SearchErrors';
import { priceBelow } from '../../../src/domain/valueObjects/AlertCondition';
import { Money } from '../../../src/domain/valueObjects/Money';

const condition = priceBelow(new Money(500, 'MXN'));

describe('Alert', () => {
  it('builds with valid properties', () => {
    const alert = new Alert('a1', 'user-1', 'https://example.com/product', condition, true, null);
    expect(alert.id).toBe('a1');
    expect(alert.userId).toBe('user-1');
    expect(alert.active).toBe(true);
    expect(alert.lastTriggeredAt).toBeNull();
  });

  it('rejects empty productUrl', () => {
    expect(() => new Alert('id', 'user', '', condition, true, null)).toThrow(InvalidProductUrl);
  });

  it('trigger() returns a new Alert with the given lastTriggeredAt', () => {
    const alert = new Alert('a1', 'user-1', 'https://example.com', condition, true, null);
    const at = new Date('2024-06-01T12:00:00Z');
    const triggered = alert.trigger(at);
    expect(triggered.lastTriggeredAt).toEqual(at);
  });

  it('trigger() preserves all other fields', () => {
    const alert = new Alert('a1', 'user-1', 'https://example.com', condition, true, null);
    const triggered = alert.trigger(new Date());
    expect(triggered.id).toBe(alert.id);
    expect(triggered.userId).toBe(alert.userId);
    expect(triggered.productUrl).toBe(alert.productUrl);
    expect(triggered.condition).toBe(alert.condition);
    expect(triggered.active).toBe(alert.active);
  });

  it('trigger() does not mutate the original alert', () => {
    const alert = new Alert('a1', 'user-1', 'https://example.com', condition, true, null);
    alert.trigger(new Date());
    expect(alert.lastTriggeredAt).toBeNull();
  });
});
