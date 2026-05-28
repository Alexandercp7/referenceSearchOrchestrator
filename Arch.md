# referenceSearchOrchestrator

API REST en Node/TypeScript que agrega resultados de Amazon MX y MercadoLibre, ranquea productos por precio/stock/entrega/MSI, y monitorea precios con alertas automáticas.

## Stack

| Capa | Tecnología |
|------|-----------|
| HTTP | Express 4 |
| BD | MySQL 8 (mysql2/promise, pool de 10 conexiones) |
| Scraping estático | cheerio + axios |
| Scraping dinámico | puppeteer-core (instancia Chromium compartida) |
| Dinero | decimal.js (aritmética exacta) |
| Auth | bcryptjs + jsonwebtoken |
| Email | nodemailer |
| Tests | vitest |

## Arquitectura: por qué está así

### Regla central: el dominio no sabe que existe Express, MySQL ni ningún scraper

Todo el negocio vive en `src/domain/`. Los use cases, entidades y value objects solo importan entre sí (y `decimal.js` para dinero). Esto no es purismo académico — tiene tres consecuencias prácticas:

1. **Los tests unitarios son rápidos y sin mocks pesados.** Un use case como `AlertEvaluation` se testea pasándole stubs simples; no necesita levantar Express ni conectar a MySQL.
2. **Cambiar de Express a Fastify, o de MySQL a Postgres, no toca el dominio.** Solo se escribe una nueva implementación de la interfaz correspondiente.
3. **Los errores de negocio tienen su propio lenguaje.** `AllStoresFailed`, `InvalidWeights`, `DuplicateEmail` son clases explícitas; el middleware de error las mapea a HTTP status codes en un solo lugar.

### Por qué Value Objects en lugar de primitivos

`Money`, `Email`, `PasswordHash`, `SearchWeights` no son strings ni numbers — son objetos que se validan al construirse y no se pueden crear en estado inválido. El efecto: cualquier función que recibe un `Money` ya sabe que el amount es positivo y la currency es válida. No hace falta re-validar en cada capa.

`SearchWeights` suma exactamente 1.0. Si el cliente manda `price=0.3&stock=0.3&delivery=0.3&msi=0.3` (suma 1.2), el Value Object lanza `InvalidWeights` antes de tocar un scraper.

### Por qué los scrapers están en infrastructure y no en los use cases

Los scrapers son detalles de implementación: sus selectores CSS cambian cuando Amazon o ML actualizan su HTML. Si el use case `ProductSearch` importara directamente `AmazonMxStore`, cada cambio de selector afectaría código de negocio. En cambio, `ProductSearch` depende de la interfaz `ProductStore` (un puerto), y los scrapers concretos la implementan. Cambiar un selector = editar solo el archivo del scraper.

### Por qué Amazon usa Cheerio y MercadoLibre usa Puppeteer

Amazon MX sirve los resultados de búsqueda en el HTML inicial — un GET con los headers correctos devuelve los datos. Cheerio (parsing de HTML estático) es suficiente y es órdenes de magnitud más rápido que lanzar un browser.

MercadoLibre renderiza los productos con JavaScript después de cargar la página. Un GET simple devuelve una página sin resultados. Puppeteer-core lanza Chromium, espera a que aparezca `div[class*="poly-card"]` y solo entonces parsea. La instancia de browser se reutiliza entre búsquedas (no se lanza una por request) para no destruir la performance.

### Por qué el normalizador existe como capa separada

Los scrapers devuelven `RawProduct` — strings sin limpiar: `"$1,299.00"`, `"Llega en 3 días"`, `"12 meses sin intereses"`. El `RegexNormalizer` convierte eso a `Product` con `Money`, `deliveryDays: number`, `msiMonths: number`. Esta separación permite:
- Testear la normalización de strings sin lanzar scrapers.
- Agregar una tercera tienda sin duplicar la lógica de parseo.

### Por qué el ranking es una Strategy

`WeightedRankStrategy` implementa la interfaz `RankStrategy`. El score de un producto es la suma ponderada de cuatro factores normalizados (precio, stock, entrega, MSI). Los pesos los manda el cliente en el query string. Si en el futuro se quiere un algoritmo ML o un ranking editorial, se escribe una nueva clase que implemente `RankStrategy` y se conecta en el Container — el use case no se toca.

### Por qué AlertCondition es una unión discriminada

Una alerta puede ser de tres tipos radicalmente distintos: precio por debajo de X, precio en el mínimo histórico, o caída de N%. En lugar de una tabla con diez columnas nullable o un switch sobre un string, `AlertCondition` es un tagged union (`kind: 'price_below' | 'price_at_min' | 'price_drop_pct'`). TypeScript obliga a manejar todos los casos; olvidar uno es error de compilación. En BD se serializa como JSON en `condition_json`.

### Por qué el Container es explícito (sin framework de DI)

`Container.ts` instancia y conecta manualmente las ~40 dependencias. No usa `tsyringe`, `inversify` ni decoradores. La razón: el grafo de dependencias es visible de una sola lectura del archivo. No hay magia de reflection ni decoradores que requieran `reflect-metadata`. El arranque del servidor es una función pura `buildApp(config) → BuiltApp`.

### Por qué el scheduler vive en infrastructure

`PriceTrackingJob` llama a `PriceRefresh` y `AlertEvaluation` en un `setInterval`. Estos use cases están en el dominio, pero el mecanismo de scheduling (timer del sistema operativo) es infraestructura. Si se migrara a un cron externo (AWS EventBridge, BullMQ), solo cambia esta clase.

## Flujo de una búsqueda

```
GET /search?q=iphone&price=0.4&stock=0.2&delivery=0.2&msi=0.2
  ↓
SearchController → valida query string → SearchRequest DTO
  ↓
ProductSearch use case
  ├─ InMemorySearchCache.get(key) → hit? devuelve cached
  └─ miss: lanza en paralelo
       ├─ AmazonMxStore.search(q)     → RawProduct[]
       └─ MercadoLibreStore.search(q) → RawProduct[]
  ↓
RegexNormalizer.normalize()  → Product[]
  ↓
WeightedRankStrategy.rank()  → RankedProduct[] (ordenados por score)
  ↓
InMemorySearchCache.set(key, result, ttl)
  ↓
SearchResponse { results, fromCache: false }
  ↓
200 JSON
```

## Flujo del scheduler (cada N segundos)

```
PriceTrackingJob.tick()
  ↓
PriceRefresh
  ├─ WatchlistRepository.findAll()
  ├─ Por cada item: Store.fetchOne(url) → RawProduct → Product
  └─ PriceHistoryRepository.saveSnapshot()
  ↓
AlertEvaluation
  ├─ AlertRepository.findActive()
  ├─ Por cada alerta: PriceHistoryRepository.getLatest() + getMin()
  ├─ Evaluador correspondiente (PriceBelowEvaluator | PriceAtMinEvaluator | PriceDropPctEvaluator)
  └─ si triggered: NotificationGateway.send() + alert.markTriggered()
```

## Estructura de carpetas

```
src/
├── domain/          # Reglas de negocio — no importa nada externo
│   ├── entities/    # User, Product, Alert, PriceSnapshot, WatchlistItem
│   ├── valueObjects/ # Money, Email, SearchWeights, AlertCondition…
│   ├── dtos/        # Contratos de entrada/salida de use cases
│   ├── interfaces/  # Puertos: repositories, gateways, services
│   ├── services/    # Evaluadores de alertas (algoritmos sin estado)
│   ├── usecases/    # Orquestación: ProductSearch, PriceRefresh…
│   └── exceptions/  # DomainError y subclases tipadas
│
├── infrastructure/  # Implementaciones concretas
│   ├── stores/      # AmazonMxStore (cheerio), MercadoLibreStore (puppeteer)
│   ├── persistence/ # MysqlUserRepository…, mappers Row↔Entity, InMemorySearchCache
│   ├── normalizer/  # RegexNormalizer: string crudo → Product validado
│   ├── ranking/     # WeightedRankStrategy
│   ├── security/    # BcryptPasswordGateway, JwtTokenGateway
│   ├── notifications/ # SmtpNotificationGateway
│   ├── scheduler/   # PriceTrackingJob
│   └── container/   # Container.ts — único punto de ensamblaje
│
└── presentation/    # Express: server, routes, authGuard, errorHandler
```

## Base de datos

`db/schema.sql` — cuatro tablas:

- **`users`** — UUID PK, email único, bcrypt hash, display name.
- **`watchlist_items`** — producto + store + usuario. Indexado por `user_id`.
- **`price_snapshots`** — historial inmutable. Una fila por tick del scheduler por producto. `amount DECIMAL(15,2)`. Indexado por `product_url(255)` para queries de rango de fechas.
- **`alerts`** — `condition_json TEXT` serializa el tagged union. `active` indexado para `findActive()`. `last_triggered_at` evita notificaciones duplicadas.

## Convenciones

- Un use case = un archivo = una clase con método `execute()`.
- Los repositorios nunca lanzan errores de dominio; los use cases los lanzan después de leer el resultado.
- Los mappers son estáticos: `UserMapper.toDomain(row)` / `UserMapper.toRow(user)`.
- `ErrorHandler` middleware es el único lugar que convierte `DomainError` a status HTTP.
- Variables de entorno: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `SCHEDULER_INTERVAL_MS`, `CACHE_TTL_MS`.
