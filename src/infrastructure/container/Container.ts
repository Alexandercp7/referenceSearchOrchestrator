import { Express } from 'express';
import { buildServer } from '../../presentation/server';

import { pool } from '../persistence/mysql/connection';
import { MysqlUserRepository } from '../persistence/mysql/MysqlUserRepository';
import { MysqlAlertRepository } from '../persistence/mysql/MysqlAlertRepository';
import { MysqlWatchlistRepository } from '../persistence/mysql/MysqlWatchlistRepository';
import { MysqlPriceHistoryRepository } from '../persistence/mysql/MysqlPriceHistoryRepository';

import { BcryptPasswordGateway } from '../security/BcryptPasswordGateway';
import { JwtTokenGateway } from '../security/JwtTokenGateway';
import { UuidGenerator } from '../identity/UuidGenerator';
import { InMemorySearchCache } from '../cache/InMemorySearchCache';

import { AmazonMxStore } from '../stores/AmazonMxStore';
import { MercadoLibreStore } from '../stores/MercadoLibreStore';
import { RegexNormalizer } from '../normalizer/RegexNormalizer';
import { WeightedRankStrategy } from '../ranking/WeightedRankStrategy';
import { SmtpNotificationGateway, SmtpConfig } from '../notifications/SmtpNotificationGateway';

import { StoreProductLookup } from '../../domain/interfaces/stores/StoreProductLookup';
import { StoreProductSearch } from '../../domain/interfaces/stores/StoreProductSearch';
import { NotificationGateway } from '../../domain/interfaces/gateways/NotificationGateway';

import { AlertCreation } from '../../domain/usecases/AlertCreation';
import { AlertEvaluation } from '../../domain/usecases/AlertEvaluation';
import { AlertListing } from '../../domain/usecases/AlertListing';
import { AlertRemoval } from '../../domain/usecases/AlertRemoval';
import { PriceHistoryQuery } from '../../domain/usecases/PriceHistoryQuery';
import { PriceRefresh } from '../../domain/usecases/PriceRefresh';
import { ProductSearch } from '../../domain/usecases/ProductSearch';
import { TokenRefresh } from '../../domain/usecases/TokenRefresh';
import { UserLogin } from '../../domain/usecases/UserLogin';
import { UserRegistration } from '../../domain/usecases/UserRegistration';
import { WatchlistAddition } from '../../domain/usecases/WatchlistAddition';
import { WatchlistRemoval } from '../../domain/usecases/WatchlistRemoval';
import { WatchlistView } from '../../domain/usecases/WatchlistView';

import { AlertController } from '../controller/AlertController';
import { AuthController } from '../controller/AuthController';
import { PriceHistoryController } from '../controller/PriceHistoryController';
import { SearchController } from '../controller/SearchController';
import { WatchlistController } from '../controller/WatchlistController';

import { PriceTrackingJob } from '../scheduler/PriceTrackingJob';

import { PriceAtMinEvaluator } from '../../domain/services/PriceAtMinEvaluator';
import { PriceBelowEvaluator } from '../../domain/services/PriceBelowEvaluator';
import { PriceDropPctEvaluator } from '../../domain/services/PriceDropPctEvaluator';
import { AlertConditionEvaluator } from '../../domain/interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../../domain/valueObjects/AlertCondition';

export interface ContainerConfig {
  jwtSecret: string;
  accessTtl?: string;
  refreshTtl?: string;
  schedulerIntervalMs: number;
  cacheTtlSeconds: number;
  smtp?: SmtpConfig;
}

export interface BuiltApp {
  app: Express;
  scheduler: PriceTrackingJob;
}

export class Container {
  static build(config: ContainerConfig): BuiltApp {
    // ─── Persistence ──────────────────────────────────────────────────
    const usersRepo = new MysqlUserRepository(pool);
    const watchlistRepo = new MysqlWatchlistRepository(pool);
    const historyRepo = new MysqlPriceHistoryRepository(pool);
    const alertsRepo = new MysqlAlertRepository(pool);
    const cache = new InMemorySearchCache();

    // ─── Security & Identity ──────────────────────────────────────────
    const passwords = new BcryptPasswordGateway();
    const tokens = new JwtTokenGateway({
      secret: config.jwtSecret,
      accessTtl: config.accessTtl,
      refreshTtl: config.refreshTtl,
    });
    const ids = new UuidGenerator();

    // ─── Stores ───────────────────────────────────────────────────────
    const amazon = new AmazonMxStore();
    const mercadolibre = new MercadoLibreStore();
    const searchableStores: StoreProductSearch[] = [amazon, mercadolibre];
    const fetchableStores = new Map<string, StoreProductLookup>([
      [amazon.name, amazon],
      [mercadolibre.name, mercadolibre],
    ]);

    // ─── Services ─────────────────────────────────────────────────────
    const normalizer = new RegexNormalizer();
    const ranker = new WeightedRankStrategy();
    const notifier: NotificationGateway = config.smtp
      ? new SmtpNotificationGateway(config.smtp)
      : {
          notify: async (user, _alert, snapshot) => {
            // eslint-disable-next-line no-console
            console.log(`[NOTIFY] ${user.email.value} | ${snapshot.price.toString()}`);
          },
        };

    const alertEvaluators = new Map<AlertCondition['kind'], AlertConditionEvaluator>([
      ['PriceBelow', new PriceBelowEvaluator()],
      ['PriceAtMin', new PriceAtMinEvaluator()],
      ['PriceDropPct', new PriceDropPctEvaluator()],
    ]);

    // ─── Use cases ────────────────────────────────────────────────────
    const registration = new UserRegistration(usersRepo, passwords, tokens, ids);
    const login = new UserLogin(usersRepo, passwords, tokens);
    const tokenRefresh = new TokenRefresh(tokens);

    const productSearch = new ProductSearch(
      searchableStores,
      normalizer,
      ranker,
      cache,
      config.cacheTtlSeconds,
    );

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

    // ─── Controllers ──────────────────────────────────────────────────
    const authController = new AuthController(registration, login, tokenRefresh);
    const searchController = new SearchController(productSearch);
    const watchlistController = new WatchlistController(
      watchlistAddition,
      watchlistRemoval,
      watchlistView,
    );
    const priceHistoryController = new PriceHistoryController(priceHistoryQuery);
    const alertController = new AlertController(alertCreation, alertRemoval, alertListing);

    // ─── Express app ──────────────────────────────────────────────────
    const app = buildServer({
      tokens,
      authController,
      searchController,
      watchlistController,
      alertController,
      priceHistoryController,
    });

    // ─── Scheduler ────────────────────────────────────────────────────
    const scheduler = new PriceTrackingJob(
      priceRefresh,
      alertEvaluation,
      config.schedulerIntervalMs,
    );

    return { app, scheduler };
  }
}
