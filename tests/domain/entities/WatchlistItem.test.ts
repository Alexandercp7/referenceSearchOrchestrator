import { describe, expect, it } from 'vitest';
import { WatchlistItem } from '../../../src/domain/entities/WatchlistItem';
import { InvalidProductUrl } from '../../../src/domain/exceptions/SearchErrors';

describe('WatchlistItem', () => {
  const now = new Date('2024-01-01');

  it('builds with valid properties', () => {
    const item = new WatchlistItem('i1', 'user-1', 'https://example.com', 'amazon', 'Monitor', now);
    expect(item.id).toBe('i1');
    expect(item.userId).toBe('user-1');
    expect(item.store).toBe('amazon');
    expect(item.title).toBe('Monitor');
    expect(item.addedAt).toBe(now);
  });

  it('rejects empty productUrl', () => {
    expect(
      () => new WatchlistItem('i1', 'user-1', '', 'amazon', 'Monitor', now),
    ).toThrow(InvalidProductUrl);
  });
});
