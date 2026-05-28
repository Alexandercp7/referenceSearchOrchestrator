import { Express } from 'express';
import { buildServer } from '../../presentation/server';

import { pool } from '../persistence/mysql/connection';
import { MysqlUserRepository } from '../persistence/mysql/MysqlUserRepository';
import { MysqlAlertRepository } from '../persistence/mysql/MysqlAlertRepository';
import { MysqlWatchlistRepository } from '../persistence/mysql/MysqlWatchlistRepository';
import { MysqlPriceHistoryRepository } from '../persistence/mysql/MysqlPriceHistoryRepository';
import { MysqlPushSubscriptionRepository } from '../persistence/mysql/MysqlPushSubscriptionRepository';

import { BcryptPasswordGateway } from '../security/BcryptPasswordGateway';
import { JwtTokenGateway } from '../security/JwtTokenGateway';
import { UuidGenerator } from '../identity/UuidGenerator';
import { InMemorySearchCache } from '../cache/InMemorySearchCache';

import { AmazonMxStore } from '../stores/AmazonMxStore';
import { MercadoLibreStore } from '../stores/MercadoLibreStore';
import { RegexNormalizer } from '../normalizer/RegexNormalizer';
import { WeightedRankStrategy } from '../ranking/WeightedRankStrategy';
import { SmtpNotificationGateway, SmtpConfig } from '../notifications/SmtpNotificationGateway';
import { WebPushNotificationGateway, VapidConfig } from '../notifications/WebPushNotificationGateway';
import { CompositeNotificationGateway } from '../notifications/CompositeNotificationGateway';
import { ConsoleNotificationGateway } from '../notifications/ConsoleNotificationGateway';

import { StoreProductLookup } from '../../domain/interfaces/stores/StoreProductLookup';
import { StoreProductSearch } from '../../domain/interfaces/stores/StoreProductSearch';
import { NotificationGateway } from '../../domain/interfaces/gateways/NotificationGateway';
import { AlertConditionEvaluator } from '../../domain/interfaces/services/AlertConditionEvaluator';
import { AlertCondition } from '../../domain/valueObjects/AlertCondition';

import { AlertCreation } from '../../domain/usecases/AlertCreation';
import { AlertEvaluation } from '../../domain/usecases/AlertEvaluation';
import { AlertListing } from '../../domain/usecases/AlertListing';
import { AlertRemoval } from '../../domain/usecases/AlertRemoval';
import { PriceHistoryQuery } from '../../domain/usecases/PriceHistoryQuery';
import { PriceRefresh } from '../../domain/usecases/PriceRefresh';
import { ProductSearch } from '../../domain/usecases/ProductSearch';
import { PushSubscriptionAddition } from '../../domain/usecases/PushSubscriptionAddition';
import { PushSubscriptionRemoval } from '../../domain/usecases/PushSubscriptionRemoval';
import { TokenRefresh } from '../../domain/usecases/TokenRefresh';
import { UpdateUserPreferences } from '../../domain/usecases/UpdateUserPreferences';
import { UserLogin } from '../../domain/usecases/UserLogin';
import { UserRegistration } from '../../domain/usecases/UserRegistration';
import { WatchlistAddition } from '../../domain/usecases/WatchlistAddition';
import { WatchlistRemoval } from '../../domain/usecases/WatchlistRemoval';
import { WatchlistView } from '../../domain/usecases/WatchlistView';

import { PriceAtMinEvaluator } from '../../domain/services/PriceAtMinEvaluator';
import { PriceBelowEvaluator } from '../../domain/services/PriceBelowEvaluator';
import { PriceDropPctEvaluator } from '../../domain/services/PriceDropPctEvaluator';

import { AlertController } from '../controller/AlertController';
import { AuthController } from '../controller/AuthController';
import { PriceHistoryController } from '../controller/PriceHistoryController';
import { PushController } from '../controller/PushController';
import { SearchController } from '../controller/SearchController';
import { UserController } from '../controller/UserController';
import { WatchlistController } from '../controller/WatchlistController';

import { PriceTrackingJob } from '../scheduler/PriceTrackingJob';

export interface ContainerConfig {
  jwtSecret: string;
  accessTtl?: string;
  refreshTtl?: string;
  bcryptRounds?: number;
  schedulerIntervalMs: number;
  cacheTtlSeconds: number;
  smtp?: SmtpConfig;
  vapid?: VapidConfig;
}

export interface BuiltApp {
  app: Express;
  scheduler: PriceTrackingJob;
}

export class Container {
  static build(config: ContainerConfig): BuiltApp {
    const repos = Container.buildRepositories();
    const { passwords, tokens, ids, cache } = Container.buildInfraServices(config);
    const { searchableStores, fetchableStores } = Container.buildStores();
    const notifier = Container.buildNotifier(config, repos.pushSubsRepo);
    const evaluators = Container.buildEvaluators();
    const normalizer = new RegexNormalizer();
    const ranker = new WeightedRankStrategy();

    // ─── Use cases ────────────────────────────────────────────────────
    const registration = new UserRegistration(repos.usersRepo, passwords, tokens, ids);
    const login = new UserLogin(repos.usersRepo, passwords, tokens);
    const tokenRefresh = new TokenRefresh(tokens);
    const updatePreferences = new UpdateUserPreferences(repos.usersRepo);

    const productSearch = new ProductSearch(
      searchableStores,
      normalizer,
      ranker,
      cache,
      config.cacheTtlSeconds,
    );

    const watchlistAddition = new WatchlistAddition(
      repos.watchlistRepo,
      repos.historyRepo,
      fetchableStores,
      normalizer,
      ids,
    );
    const watchlistRemoval = new WatchlistRemoval(repos.watchlistRepo);
    const watchlistView = new WatchlistView(repos.watchlistRepo, repos.historyRepo);

    const priceRefresh = new PriceRefresh(
      repos.watchlistRepo,
      repos.historyRepo,
      fetchableStores,
      normalizer,
      ids,
    );
    const priceHistoryQuery = new PriceHistoryQuery(repos.historyRepo);

    const alertCreation = new AlertCreation(repos.alertsRepo, ids);
    const alertRemoval = new AlertRemoval(repos.alertsRepo);
    const alertListing = new AlertListing(repos.alertsRepo);
    const alertEvaluation = new AlertEvaluation(
      repos.alertsRepo,
      repos.historyRepo,
      repos.usersRepo,
      notifier,
      evaluators,
    );

    const pushAddition = new PushSubscriptionAddition(repos.pushSubsRepo, ids);
    const pushRemoval = new PushSubscriptionRemoval(repos.pushSubsRepo);

    // ─── Controllers ──────────────────────────────────────────────────
    const authController = new AuthController(registration, login, tokenRefresh);
    const userController = new UserController(updatePreferences);
    const searchController = new SearchController(productSearch);
    const watchlistController = new WatchlistController(
      watchlistAddition,
      watchlistRemoval,
      watchlistView,
    );
    const priceHistoryController = new PriceHistoryController(priceHistoryQuery);
    const alertController = new AlertController(alertCreation, alertRemoval, alertListing);
    const pushController = new PushController(
      pushAddition,
      pushRemoval,
      config.vapid?.publicKey ?? '',
    );

    // ─── Express app ──────────────────────────────────────────────────
    const app = buildServer({
      tokens,
      authController,
      userController,
      searchController,
      watchlistController,
      alertController,
      priceHistoryController,
      pushController,
    });

    // ─── Scheduler ────────────────────────────────────────────────────
    const scheduler = new PriceTrackingJob(
      priceRefresh,
      alertEvaluation,
      config.schedulerIntervalMs,
    );

    return { app, scheduler };
  }

  private static buildRepositories() {
    return {
      usersRepo: new MysqlUserRepository(pool),
      watchlistRepo: new MysqlWatchlistRepository(pool),
      historyRepo: new MysqlPriceHistoryRepository(pool),
      alertsRepo: new MysqlAlertRepository(pool),
      pushSubsRepo: new MysqlPushSubscriptionRepository(pool),
    };
  }

  private static buildInfraServices(config: ContainerConfig) {
    return {
      passwords: new BcryptPasswordGateway(config.bcryptRounds),
      tokens: new JwtTokenGateway({
        secret: config.jwtSecret,
        accessTtl: config.accessTtl,
        refreshTtl: config.refreshTtl,
      }),
      ids: new UuidGenerator(),
      cache: new InMemorySearchCache(),
    };
  }

  private static buildStores(): {
    searchableStores: StoreProductSearch[];
    fetchableStores: Map<string, StoreProductLookup>;
  } {
    const amazon = new AmazonMxStore();
    const mercadolibre = new MercadoLibreStore();
    return {
      searchableStores: [amazon, mercadolibre],
      fetchableStores: new Map<string, StoreProductLookup>([
        [amazon.name, amazon],
        [mercadolibre.name, mercadolibre],
      ]),
    };
  }

  private static buildNotifier(
    config: ContainerConfig,
    pushSubsRepo: MysqlPushSubscriptionRepository,
  ): NotificationGateway {
    const gateways: NotificationGateway[] = [];

    if (config.smtp) gateways.push(new SmtpNotificationGateway(config.smtp));
    if (config.vapid) gateways.push(new WebPushNotificationGateway(pushSubsRepo, config.vapid));
    if (gateways.length === 0) gateways.push(new ConsoleNotificationGateway());

    return new CompositeNotificationGateway(gateways);
  }

  private static buildEvaluators(): Map<AlertCondition['kind'], AlertConditionEvaluator> {
    return new Map<AlertCondition['kind'], AlertConditionEvaluator>([
      ['PriceBelow', new PriceBelowEvaluator()],
      ['PriceAtMin', new PriceAtMinEvaluator()],
      ['PriceDropPct', new PriceDropPctEvaluator()],
    ]);
  }
}
