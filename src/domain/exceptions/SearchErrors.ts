import { DomainError } from './DomainError';

export class InvalidProductUrl extends DomainError {
  readonly code = 'INVALID_PRODUCT_URL';

  constructor(url: string) {
    super(`Product URL must be a non-empty string, got: "${url}"`);
  }
}

export class InvalidScore extends DomainError {
  readonly code = 'INVALID_SCORE';

  constructor(score: number) {
    super(`Score must be in [0, 1], got ${score}`);
  }
}

export class InvalidProduct extends DomainError {
  readonly code = 'INVALID_PRODUCT';
}

export class AllStoresFailed extends DomainError {
  readonly code = 'ALL_STORES_FAILED';

  constructor(query: string) {
    super(`All store adapters failed for query: ${query}`);
  }
}

export class InvalidWeights extends DomainError {
  readonly code = 'INVALID_WEIGHTS';

  constructor(reason: string) {
    super(`Invalid search weights: ${reason}`);
  }
}

export class ProductNotFound extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';

  constructor(url: string) {
    super(`Product not found at URL: ${url}`);
  }
}
