import { describe, expect, it } from 'vitest';
import { InvalidWeights } from '../../../src/domain/exceptions/SearchErrors';
import { SearchWeights } from '../../../src/domain/valueObjects/SearchWeights';

describe('SearchWeights', () => {
  it('accepts weights summing to 1.0', () => {
    const w = new SearchWeights(0.4, 0.3, 0.2, 0.1);
    expect(w.price).toBe(0.4);
  });

  it('rejects weights that do not sum to 1', () => {
    expect(() => new SearchWeights(0.5, 0.5, 0.5, 0.5)).toThrow(InvalidWeights);
  });

  it('rejects out-of-range weights', () => {
    expect(() => new SearchWeights(-0.1, 0.4, 0.4, 0.3)).toThrow(InvalidWeights);
    expect(() => new SearchWeights(1.5, 0, 0, 0)).toThrow(InvalidWeights);
  });

  it('factory balanced() returns equal weights', () => {
    const w = SearchWeights.balanced();
    expect(w.price).toBe(0.25);
    expect(w.stock).toBe(0.25);
    expect(w.delivery).toBe(0.25);
    expect(w.msi).toBe(0.25);
  });
});
