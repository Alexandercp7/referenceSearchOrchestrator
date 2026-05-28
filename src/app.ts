import express, { Express } from 'express';
import './infrastructure/http/ExpressTypes';
import { StoreProductLookup } from './domain/interfaces/stores/StoreProductLookup';
import { StoreProductSearch } from './domain/interfaces/stores/StoreProductSearch';

import { AlertCreation } from './domain/usecases/AlertCreation';
import { AlertEvaluation } from './domain/usecases/AlertEvaluation';
import { AlertListing } from './domain/usecases/AlertListing';
import { AlertRemoval } from './domain/usecases/AlertRemoval';
import { PriceHistoryQuery } from './domain/usecases/PriceHistoryQuery';
import { PriceRefresh } from './domain/usecases/PriceRefresh';
import { ProductSearch } from './domain/usecases/ProductSearch';
import { TokenRefresh } from './domain/usecases/TokenRefresh';
import { UserLogin } from './domain/usecases/UserLogin';
import { UserRegistration } from './domain/usecases/UserRegistration';
import { WatchlistAddition } from './domain/usecases/WatchlistAddition';
import { WatchlistRemoval } from './domain/usecases/WatchlistRemoval';
import { WatchlistView } from './domain/usecases/WatchlistView';

import { AlertController } from './infrastructure/controller/AlertController';
import { AuthController } from './infrastructure/controller/AuthController';
import { PriceHistoryController } from './infrastructure/controller/PriceHistoryController';
import { SearchController } from './infrastructure/controller/SearchController';
import { WatchlistController } from './infrastructure/controller/WatchlistController';

import { authMiddleware } from './infrastructure/http/AuthMiddleware';
import { errorHandler } from './infrastructure/http/ErrorHandler';

import { BasicNormalizer } from './infrastructure/repositories/BasicNormalizer';
import { UuidGenerator } from './infrastructure/repositories/UuidGenerator';
import { ConsoleNotificationGateway } from './infrastructure/repositories/ConsoleNotificationGateway';
import { InMemoryAlertRepository } from './infrastructure/repositories/InMemoryAlertRepository';
import { InMemoryPriceHistoryRepository } from './infrastructure/repositories/InMemoryPriceHistoryRepository';
import { InMemorySearchCache } from './infrastructure/repositories/InMemorySearchCache';
import { InMemoryUserRepository } from './infrastructure/repositories/InMemoryUserRepository';
import { InMemoryWatchlistRepository } from './infrastructure/repositories/InMemoryWatchlistRepository';
import { JwtBcryptAuthGateway } from './infrastructure/repositories/JwtBcryptAuthGateway';
import { MockAmazonStore } from './infrastructure/repositories/MockAmazonStore';
import { MockMercadoLibreStore } from './infrastructure/repositories/MockMercadoLibreStore';
import { WeightedRankStrategy } from './infrastructure/repositories/WeightedRankStrategy';

import { PriceTrackingJob } from './infrastructure/scheduler/PriceTrackingJob';

import { PriceAtMinEvaluator } from './domain/services/PriceAtMinEvaluator';
import { PriceBelowEvaluator } from './domain/services/PriceBelowEvaluator';
import { PriceDropPctEvaluator } from './domain/services/PriceDropPctEvaluator';
import { AlertConditionEvaluator } from './domain/interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from './domain/valueObjects/AlertCondition';

export interface AppConfig {
  jwtSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  bcryptRounds: number;
  schedulerIntervalMs: number;
  cacheTtlSeconds: number;
}

export interface BuiltApp {
  app: Express;
  scheduler: PriceTrackingJob;
}

export function buildApp(config: AppConfig): BuiltApp {
  // ─── Adapters / Gateways / Stores / Services ──────────────────────────
  const usersRepo = new InMemoryUserRepository();
  const watchlistRepo = new InMemoryWatchlistRepository();
  const historyRepo = new InMemoryPriceHistoryRepository();
  const alertsRepo = new InMemoryAlertRepository();
  const cache = new InMemorySearchCache();

  const auth = new JwtBcryptAuthGateway({
    secret: config.jwtSecret,
    accessTtl: config.jwtAccessTtl,
    refreshTtl: config.jwtRefreshTtl,
    bcryptRounds: config.bcryptRounds,
  });
  const notifier = new ConsoleNotificationGateway();

  const amazon = new MockAmazonStore();
  const mercadolibre = new MockMercadoLibreStore();
  const searchableStores: StoreProductSearch[] = [amazon, mercadolibre];
  const fetchableStores = new Map<string, StoreProductLookup>([
    [amazon.name, amazon],
    [mercadolibre.name, mercadolibre],
  ]);

  const normalizer = new BasicNormalizer();
  const ranker = new WeightedRankStrategy();
  const ids = new UuidGenerator();

  const alertEvaluators = new Map<AlertCondition['kind'], AlertConditionEvaluator>([
    ['PriceBelow', new PriceBelowEvaluator()],
    ['PriceAtMin', new PriceAtMinEvaluator()],
    ['PriceDropPct', new PriceDropPctEvaluator()],
  ]);

  // ─── Use cases ────────────────────────────────────────────────────────
  const registration = new UserRegistration(usersRepo, auth, auth, ids);
  const login = new UserLogin(usersRepo, auth, auth);
  const tokenRefresh = new TokenRefresh(auth);

  const productSearch = new ProductSearch(searchableStores, normalizer, ranker, cache, config.cacheTtlSeconds);

  const watchlistAddition = new WatchlistAddition(
    watchlistRepo,
    historyRepo,
    fetchableStores,
    normalizer,
    ids,
  );
  const watchlistRemoval = new WatchlistRemoval(watchlistRepo);
  const watchlistView = new WatchlistView(watchlistRepo, historyRepo);

  const priceRefresh = new PriceRefresh(watchlistRepo, historyRepo, fetchableStores, normalizer, ids);
  const priceHistoryQuery = new PriceHistoryQuery(historyRepo);

  const alertCreation = new AlertCreation(alertsRepo, ids);
  const alertRemoval = new AlertRemoval(alertsRepo);
  const alertListing = new AlertListing(alertsRepo);
  const alertEvaluation = new AlertEvaluation(
    alertsRepo,
    historyRepo,
    usersRepo,
    notifier,
    alertEvaluators,
  );

  // ─── Controllers ──────────────────────────────────────────────────────
  const authController = new AuthController(registration, login, tokenRefresh);
  const searchController = new SearchController(productSearch);
  const watchlistController = new WatchlistController(
    watchlistAddition,
    watchlistRemoval,
    watchlistView,
  );
  const priceHistoryController = new PriceHistoryController(priceHistoryQuery);
  const alertController = new AlertController(alertCreation, alertRemoval, alertListing);

  // ─── Express app ──────────────────────────────────────────────────────
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

  app.use('/auth', authController.router);
  app.use('/search', searchController.router);

  // Protected routes
  const requireAuth = authMiddleware(auth);
  app.use('/watchlist', requireAuth, watchlistController.router);
  app.use('/alerts', requireAuth, alertController.router);
  app.use('/price-history', requireAuth, priceHistoryController.router);

  app.use(errorHandler);

  // ─── Scheduler ────────────────────────────────────────────────────────
  const scheduler = new PriceTrackingJob(
    priceRefresh,
    alertEvaluation,
    config.schedulerIntervalMs,
  );

  return { app, scheduler };
}
