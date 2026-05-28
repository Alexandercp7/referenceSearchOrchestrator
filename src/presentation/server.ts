import path from 'path';
import express, { Express } from 'express';
import '../infrastructure/http/ExpressTypes';

import { TokenGateway } from '../domain/interfaces/gateways/TokenGateway';
import { AuthController } from '../infrastructure/controller/AuthController';
import { SearchController } from '../infrastructure/controller/SearchController';
import { WatchlistController } from '../infrastructure/controller/WatchlistController';
import { AlertController } from '../infrastructure/controller/AlertController';
import { PriceHistoryController } from '../infrastructure/controller/PriceHistoryController';

import { authGuard } from './middleware/authGuard';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { searchRoutes } from './routes/search.routes';
import { watchlistRoutes } from './routes/watchlist.routes';
import { alertRoutes } from './routes/alerts.routes';
import { priceHistoryRoutes } from './routes/priceHistory.routes';

export interface ServerDeps {
  tokens: TokenGateway;
  authController: AuthController;
  searchController: SearchController;
  watchlistController: WatchlistController;
  alertController: AlertController;
  priceHistoryController: PriceHistoryController;
}

export function buildServer(deps: ServerDeps): Express {
  const app = express();
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    next();
  });
  app.options('*' as never, (_req, res) => res.status(204).send());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../../public')));

  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

  app.use('/auth', authRoutes(deps.authController));
  app.use('/search', searchRoutes(deps.searchController));

  const requireAuth = authGuard(deps.tokens);
  app.use('/watchlist', requireAuth, watchlistRoutes(deps.watchlistController));
  app.use('/alerts', requireAuth, alertRoutes(deps.alertController));
  app.use('/price-history', requireAuth, priceHistoryRoutes(deps.priceHistoryController));

  app.use(errorHandler);

  return app;
}
