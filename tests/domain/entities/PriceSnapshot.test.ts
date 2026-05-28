import { describe, expect, it } from 'vitest';
import { PriceSnapshot } from '../../../src/domain/entities/PriceSnapshot';
import { InvalidProductUrl } from '../../../src/domain/exceptions/SearchErrors';
import { Money } from '../../../src/domain/valueObjects/Money';

describe('PriceSnapshot', () => {
  const price = new Money(500, 'MXN');
  const now = new Date('2024-06-01');

  it('builds with valid properties', () => {
    const snap = new PriceSnapshot('s1', 'https://example.com', 'amazon', 'Monitor', price, now);
    expect(snap.id).toBe('s1');
    expect(snap.store).toBe('amazon');
    expect(snap.title).toBe('Monitor');
    expect(snap.price).toBe(price);
    expect(snap.scrapedAt).toBe(now);
  });

  it('rejects empty productUrl', () => {
    expect(() => new PriceSnapshot('s1', '', 'amazon', 'Monitor', price, now)).toThrow(InvalidProductUrl);
  });
});
