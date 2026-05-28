import { ErrorRequestHandler } from 'express';
import { DomainError } from '../../domain/exceptions/DomainError';

const STATUS_BY_CODE: Record<string, number> = {
  USER_ALREADY_EXISTS: 409,
  USER_NOT_FOUND: 404,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  INVALID_EMAIL: 400,
  INVALID_DISPLAY_NAME: 400,
  INVALID_PASSWORD_HASH: 400,
  INVALID_MONEY: 400,
  INVALID_DATE_RANGE: 400,
  ITEM_ALREADY_TRACKED: 409,
  WATCHLIST_ITEM_NOT_FOUND: 404,
  UNKNOWN_STORE: 400,
  ALERT_NOT_FOUND: 404,
  INVALID_ALERT_CONDITION: 400,
  ALL_STORES_FAILED: 502,
  INVALID_SEARCH_QUERY: 400,
  INVALID_WEIGHTS: 400,
  PRODUCT_NOT_FOUND: 404,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DomainError) {
    const status = STATUS_BY_CODE[err.code] ?? 400;
    res.status(status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[UNHANDLED]', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
