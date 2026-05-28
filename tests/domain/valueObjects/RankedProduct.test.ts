import { describe, expect, it } from 'vitest';
import { RankedProduct } from '../../../src/domain/dtos/search/RankedProduct';
import { InvalidScore } from '../../../src/domain/exceptions/SearchErrors';
import { Money } from '../../../src/domain/valueObjects/Money';

const price = new Money(1000, 'MXN');

describe('RankedProduct', () => {
  it('builds with score in (0, 1)', () => {
    const rp = new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, 0.75);
    expect(rp.score).toBe(0.75);
    expect(rp.productId).toBe('id');
  });

  it('accepts score of exactly 0', () => {
    expect(
      () => new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, 0),
    ).not.toThrow();
  });

  it('accepts score of exactly 1', () => {
    expect(
      () => new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, 1),
    ).not.toThrow();
  });

  it('rejects score below 0', () => {
    expect(
      () => new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, -0.1),
    ).toThrow(InvalidScore);
  });

  it('rejects score above 1', () => {
    expect(
      () => new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, 1.1),
    ).toThrow(InvalidScore);
  });

  it('rejects NaN score', () => {
    expect(
      () => new RankedProduct('id', 'Monitor', 'amazon', 'https://example.com', price, NaN),
    ).toThrow(InvalidScore);
  });
});
