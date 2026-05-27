import { DomainError } from './DomainError';

export class ItemAlreadyTracked extends DomainError {
  readonly code = 'ITEM_ALREADY_TRACKED';

  constructor(productUrl: string) {
    super(`Item is already in the watchlist: ${productUrl}`);
  }
}

export class WatchlistItemNotFound extends DomainError {
  readonly code = 'WATCHLIST_ITEM_NOT_FOUND';

  constructor(id: string) {
    super(`Watchlist item not found: ${id}`);
  }
}

export class UnknownStore extends DomainError {
  readonly code = 'UNKNOWN_STORE';

  constructor(store: string) {
    super(`Unknown store: ${store}`);
  }
}
