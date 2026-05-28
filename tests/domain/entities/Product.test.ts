import { describe, expect, it } from 'vitest';
import { Product } from '../../../src/domain/entities/Product';
import { InvalidProduct } from '../../../src/domain/exceptions/SearchErrors';
import { Money } from '../../../src/domain/valueObjects/Money';

const price = new Money(1000, 'MXN');

describe('Product', () => {
  it('builds with valid fields', () => {
    const p = new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, 3, 12);
    expect(p.id).toBe('id');
    expect(p.title).toBe('Monitor');
    expect(p.inStock).toBe(true);
    expect(p.deliveryDays).toBe(3);
    expect(p.msi).toBe(12);
  });

  it('defaults msi to 0 when not provided', () => {
    const p = new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, 3);
    expect(p.msi).toBe(0);
  });

  it('accepts deliveryDays of 0', () => {
    expect(
      () => new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, 0),
    ).not.toThrow();
  });

  it('accepts msi of 0', () => {
    expect(
      () => new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, 3, 0),
    ).not.toThrow();
  });

  it('rejects negative deliveryDays', () => {
    expect(
      () => new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, -1),
    ).toThrow(InvalidProduct);
  });

  it('rejects negative msi', () => {
    expect(
      () => new Product('id', 'Monitor', price, 'amazon', 'https://example.com', true, 3, -1),
    ).toThrow(InvalidProduct);
  });
});
