# Contratos de Tests — Guía TDD

Cada sección describe exactamente qué debe cumplir cada clase/función para que los tests pasen.
Implementa en el orden indicado: las dependencias siempre antes que quien las usa.

> **Convención de errores**: todos los errores de dominio extienden una clase base `DomainError`
> (abstracta, extiende `Error`). Créala primero en `src/domain/exceptions/DomainError.ts`.

---

## Grupo 0 — Base

### `DomainError` (`src/domain/exceptions/DomainError.ts`)
- Clase abstracta que extiende `Error`.
- Todos los errores de dominio la extienden.

---

## Grupo 1 — ProductSearch

### Value Objects

#### `Money` (`src/domain/valueObjects/Money.ts`)

Exporta también `InvalidMoney extends DomainError`.

| Test | Qué espera |
|------|------------|
| builds with valid amount and currency | `new Money(100, 'mxn')` → `amount.toNumber() === 100`, `currency === 'MXN'` (normaliza a mayúsculas) |
| rejects negative amounts | `new Money(-1, 'MXN')` lanza `InvalidMoney` |
| rejects invalid currency code | `new Money(100, 'PESOS')` lanza `InvalidMoney` (solo códigos ISO 3 letras) |
| adds money of the same currency | `new Money(10,'MXN').add(new Money(5,'MXN'))` → `amount === 15` |
| fails when adding different currencies | `new Money(10,'MXN').add(new Money(5,'USD'))` lanza `InvalidMoney` |
| computes percent drop correctly | `new Money(80,'MXN').percentDropFrom(new Money(100,'MXN')) === 20` |

**Contrato de la clase:**
- Usa `decimal.js` internamente (`Decimal`).
- Campos: `readonly amount: Decimal`, `readonly currency: string` (en mayúsculas).
- Métodos: `add(other: Money): Money`, `percentDropFrom(previous: Money): number`.
- Métodos de comparación que usan los tests de evaluadores: `isLessThan`, `equals`, `isGreaterThan` (inferidos).
- Valida: amount ≥ 0, currency de exactamente 3 letras mayúsculas.

---

#### `SearchWeights` (`src/domain/valueObjects/SearchWeights.ts`)

Importa `InvalidWeights` de `src/domain/exceptions/SearchErrors`.

| Test | Qué espera |
|------|------------|
| accepts weights summing to 1.0 | `new SearchWeights(0.4, 0.3, 0.2, 0.1)` → `price === 0.4` |
| rejects weights that do not sum to 1 | `new SearchWeights(0.5, 0.5, 0.5, 0.5)` lanza `InvalidWeights` |
| rejects out-of-range weights | negativo o > 1 lanza `InvalidWeights` |
| factory balanced() | `price === stock === delivery === msi === 0.25` |

**Contrato de la clase:**
- Constructor: `(price, stock, delivery, msi)` todos `readonly number`.
- Validación: cada campo en `[0, 1]` y la suma en `[1 - EPSILON, 1 + EPSILON]` con `EPSILON = 0.001`.
- Static factories: `balanced()` y `priceFocused()` (0.7 / 0.1 / 0.1 / 0.1).

---

### Excepciones de búsqueda (`src/domain/exceptions/SearchErrors.ts`)

Exporta estas clases (todas extienden `DomainError`):

| Nombre | Cuándo se lanza |
|--------|----------------|
| `InvalidWeights` | pesos inválidos en `SearchWeights` |
| `AllStoresFailed` | todas las tiendas fallaron o devolvieron vacío |
| `ProductNotFound` | `fetchOne` devuelve `null` |
| `InvalidProductUrl` | `productUrl` vacío en entidades |
| `InvalidProduct` | `deliveryDays` o `msi` negativos en `Product` |
| `InvalidScore` | score fuera de `[0, 1]` en `RankedProduct` |

---

### DTOs de búsqueda

#### `RawProduct` (`src/domain/dtos/search/RawProduct.ts`)
Tipo plano (interface o type):
```ts
{ title, priceText, currency, store, url, inStockText, deliveryText, msiText }
```

#### `RankedProduct` (`src/domain/dtos/search/RankedProduct.ts`)

Exporta también `InvalidScore extends DomainError`.

| Test | Qué espera |
|------|------------|
| builds with score in (0,1) | `new RankedProduct('id','Monitor','amazon','https://...',price, 0.75)` → `score===0.75`, `productId==='id'` |
| accepts score of exactly 0 | no lanza |
| accepts score of exactly 1 | no lanza |
| rejects score below 0 | lanza `InvalidScore` |
| rejects score above 1 | lanza `InvalidScore` |
| rejects NaN score | lanza `InvalidScore` |

**Contrato de la clase:**
- Constructor: `(productId, title, store, url, price: Money, score: number)`.
- Campos `readonly`: `productId`, `title`, `store`, `url`, `price`, `score`.

#### `SearchResponse` (`src/domain/dtos/search/SearchResponse.ts`)
```ts
{ query: string, results: RankedProduct[], fromCache: boolean }
```

#### `SearchRequest` (`src/domain/dtos/search/SearchRequest.ts`)
```ts
{ query: string, weights: SearchWeights }
```

---

### Interfaces de tiendas

#### `StoreProductSearch` (`src/domain/interfaces/stores/StoreProductSearch.ts`)
```ts
interface StoreProductSearch {
  readonly name: string;
  search(query: string): Promise<RawProduct[]>;
}
```

#### `StoreProductLookup` (`src/domain/interfaces/stores/StoreProductLookup.ts`)
```ts
interface StoreProductLookup {
  readonly name: string;
  fetchOne(url: string): Promise<RawProduct | null>;
}
```

#### `Store` (`src/domain/interfaces/stores/Store.ts`)
```ts
interface Store extends StoreProductSearch, StoreProductLookup {}
```

---

### Interfaces de servicios

#### `Normalizer` (`src/domain/interfaces/services/Normalizer.ts`)
```ts
interface Normalizer {
  normalize(raw: RawProduct): Product;
}
```

#### `RankStrategy` (`src/domain/interfaces/services/RankStrategy.ts`)
```ts
interface RankStrategy {
  rank(products: Product[], weights: SearchWeights): RankedProduct[];
}
```

#### `SearchCache` (`src/domain/interfaces/services/SearchCache.ts`)
```ts
interface SearchCache {
  get(key: string): Promise<SearchResponse | null>;
  set(key: string, value: SearchResponse, ttlSeconds?: number): Promise<void>;
}
```

---

### Entidad `Product` (`src/domain/entities/Product.ts`)

Exporta también `InvalidProduct` (o importa de `SearchErrors`).

| Test | Qué espera |
|------|------------|
| builds with valid fields | `new Product('id','Monitor',price,'amazon','https://...',true,3,12)` → todos los campos correctos |
| defaults msi to 0 | sin 8º arg → `msi === 0` |
| accepts deliveryDays of 0 | no lanza |
| accepts msi of 0 | no lanza |
| rejects negative deliveryDays | lanza `InvalidProduct` |
| rejects negative msi | lanza `InvalidProduct` |

**Constructor:** `(id, title, price: Money, store, url, inStock: boolean, deliveryDays: number, msi = 0)`

---

### Use Case `ProductSearch` (`src/domain/usecases/ProductSearch.ts`)

Constructor: `(stores: StoreProductSearch[], normalizer: Normalizer, ranker: RankStrategy, cache: SearchCache, cacheTtlSeconds?: number)`

| Test | Qué espera |
|------|------------|
| returns ranked products from a store | `search({query, weights})` → `fromCache===false`, `results.length > 0`, `query==='monitor'` |
| returns results from cache on second call | segunda llamada idéntica → `fromCache===true` |
| aggregates results from multiple stores | 2 stores × 1 product cada uno → `results.length===2` |
| throws AllStoresFailed when all return empty | store devuelve `[]` → lanza `AllStoresFailed` |
| throws AllStoresFailed when all stores throw | store lanza error → lanza `AllStoresFailed` |
| returns results when at least one succeeds | 1 failing + 1 ok → `results.length > 0` (usa `Promise.allSettled`) |
| cache key includes weights | misma query, pesos distintos → segunda llamada `fromCache===false` |

**Flujo interno:**
1. Construir clave de caché con `query` + los 4 pesos.
2. Si hay hit → devolver con `fromCache: true`.
3. `Promise.allSettled` sobre todos los stores.
4. Aplanar resultados fulfilled. Si vacío → lanzar `AllStoresFailed`.
5. Normalizar → rankear → `SearchResponse` con `fromCache: false`.
6. Guardar en caché y devolver.

---

## Grupo 2 — Auth

### Value Objects

#### `Email` (`src/domain/valueObjects/Email.ts`)

Importa `InvalidEmail` de `src/domain/exceptions/UserErrors`.

| Test | Qué espera |
|------|------------|
| accepts valid email and normalizes | `new Email('USER@Example.COM').value === 'user@example.com'` |
| trims whitespace | `'  user@example.com  '` → `'user@example.com'` |
| rejects without @ | lanza `InvalidEmail` |
| rejects missing domain | `'user@'` lanza `InvalidEmail` |
| rejects missing local part | `'@example.com'` lanza `InvalidEmail` |
| rejects with spaces | `'user name@example.com'` lanza `InvalidEmail` |
| rejects empty string | lanza `InvalidEmail` |
| equals() same email regardless of case | `new Email('foo@bar.com').equals(new Email('FOO@BAR.COM')) === true` |
| equals() different emails | `false` |
| toString() returns normalized value | `new Email('FOO@BAR.COM').toString() === 'foo@bar.com'` |

---

#### `PasswordHash` (`src/domain/valueObjects/PasswordHash.ts`)

Importa `InvalidPasswordHash` de `src/domain/exceptions/UserErrors`.

| Test | Qué espera |
|------|------------|
| accepts string ≥ 20 chars | `asPasswordHash('$2b$10$aaaaaaaaaaaaaaaaaaaa')` → string, valor intacto |
| accepts exactly 20 chars | no lanza |
| accepts strings > 20 chars | no lanza |
| rejects string < 20 chars | lanza `InvalidPasswordHash` |
| rejects empty string | lanza `InvalidPasswordHash` |
| rejects 19-char string | lanza `InvalidPasswordHash` |

**Contrato:** `PasswordHash` es un branded type (`string & { __brand: 'PasswordHash' }`).
Exporta `asPasswordHash(s: string): PasswordHash` que valida la longitud mínima de 20.

---

### Excepciones de usuarios (`src/domain/exceptions/UserErrors.ts`)

| Nombre | Cuándo |
|--------|--------|
| `InvalidEmail` | email inválido |
| `InvalidPasswordHash` | hash muy corto |
| `UserAlreadyExists` | email ya registrado |
| `InvalidCredentials` | usuario no encontrado o password incorrecta |

---

### Entidad `User` (`src/domain/entities/User.ts`)

| Test | Qué espera |
|------|------------|
| builds with all properties | campos accesibles: `id`, `email`, `passwordHash`, `createdAt` |

**Constructor:** `(id: string, email: Email, passwordHash: PasswordHash, createdAt: Date)`

---

### DTOs de Auth
```
src/domain/dtos/auth/RegistrationRequest.ts → { email: string, password: string }
src/domain/dtos/auth/LoginRequest.ts         → { email: string, password: string }
src/domain/dtos/auth/AuthResponse.ts         → { userId: string, accessToken: string, refreshToken: string }
```

---

### Interfaces de gateways Auth

#### `AuthGateway` (`src/domain/interfaces/gateways/AuthGateway.ts`)

> **Nota:** `UserRegistration` usa un `AuthGateway` combinado, mientras que `UserLogin`
> usa `PasswordGateway` y `TokenGateway` por separado. Crea los tres.

```ts
// TokenPayload y TokenPair compartidos entre archivos
type TokenPayload = { userId: string; email: string };
type TokenPair = { accessToken: string; refreshToken: string };

interface AuthGateway {
  hashPassword(plain: string): Promise<string>;
  verifyPassword(plain: string, hash: PasswordHash): Promise<boolean>;
  createTokens(payload: TokenPayload): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  refresh(refreshToken: string): Promise<TokenPair>;
}
```

#### `PasswordGateway` (`src/domain/interfaces/gateways/PasswordGateway.ts`)
```ts
interface PasswordGateway {
  hashPassword(plain: string): Promise<string>;
  verifyPassword(plain: string, hash: PasswordHash): Promise<boolean>;
}
```

#### `TokenGateway` (`src/domain/interfaces/gateways/TokenGateway.ts`)
```ts
interface TokenGateway {
  createTokens(payload: TokenPayload): Promise<TokenPair>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  refresh(refreshToken: string): Promise<TokenPair>;
}
```

#### `UserRepository` (`src/domain/interfaces/repositories/UserRepository.ts`)
```ts
interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

---

### Use Case `UserRegistration` (`src/domain/usecases/UserRegistration.ts`)

Constructor: `(users: UserRepository, passwords: PasswordGateway | AuthGateway, tokens: TokenGateway | AuthGateway)`

> En el test se llama `new UserRegistration(users, auth, auth)` donde `auth` implementa `AuthGateway`.

| Test | Qué espera |
|------|------------|
| registers a new user and returns tokens | `register({email, password})` → `userId` truthy, `accessToken` contiene `'access-'`, `refreshToken` contiene `'refresh-'` |
| fails if email already registered | segunda llamada mismo email → lanza `UserAlreadyExists` |

**Flujo:** construir `Email` → verificar no existe → hashear → crear `User` con `randomUUID()` → guardar → crear tokens → devolver `AuthResponse`.

---

### Use Case `UserLogin` (`src/domain/usecases/UserLogin.ts`)

Constructor: `(users: UserRepository, passwords: PasswordGateway, tokens: TokenGateway)`

| Test | Qué espera |
|------|------------|
| returns tokens for valid credentials | `login({email, password})` → `userId==='user-1'`, tokens con `'at-'` y `'rt-'` |
| throws InvalidCredentials when user not found | lanza `InvalidCredentials` |
| throws InvalidCredentials when password wrong | lanza `InvalidCredentials` |
| same error for missing user and wrong password | `errA.message === errB.message` (no distinguir el motivo) |

---

### Use Case `TokenRefresh` (`src/domain/usecases/TokenRefresh.ts`)

Constructor: `(tokens: TokenGateway)`

| Test | Qué espera |
|------|------------|
| delegates to gateway and returns new pair | `refresh('my-refresh-token')` → `{accessToken: 'new-at-my-refresh-token', refreshToken: 'new-rt-my-refresh-token'}` |

---

## Grupo 3 — Watchlist

### Entidades

#### `WatchlistItem` (`src/domain/entities/WatchlistItem.ts`)

| Test | Qué espera |
|------|------------|
| builds with valid properties | campos: `id`, `userId`, `productUrl`, `store`, `title`, `addedAt` |
| rejects empty productUrl | lanza `InvalidProductUrl` |

**Constructor:** `(id, userId, productUrl, store, title, addedAt: Date)`

---

#### `PriceSnapshot` (`src/domain/entities/PriceSnapshot.ts`)

| Test | Qué espera |
|------|------------|
| builds with valid properties | campos: `id`, `productUrl`, `store`, `price: Money`, `scrapedAt: Date` |
| rejects empty productUrl | lanza `InvalidProductUrl` |

**Constructor:** `(id, productUrl, store, price: Money, scrapedAt: Date)`

---

### Excepciones de Watchlist (`src/domain/exceptions/WatchlistErrors.ts`)

| Nombre | Cuándo |
|--------|--------|
| `ItemAlreadyTracked` | producto ya existe para ese usuario |
| `WatchlistItemNotFound` | ítem no encontrado por id |
| `UnknownStore` | store no registrado en el mapa |

---

### DTOs de Watchlist
```
src/domain/dtos/watchlist/AddItemRequest.ts   → { userId: string, productUrl: string, store: string }
src/domain/dtos/watchlist/WatchlistItemView.ts → { id, productUrl, store, title, addedAt, currentPrice: Money | null }
```

---

### Interfaces

#### `WatchlistRepository` (`src/domain/interfaces/repositories/WatchlistRepository.ts`)
```ts
interface WatchlistRepository {
  exists(userId: string, productUrl: string): Promise<boolean>;
  save(item: WatchlistItem): Promise<void>;
  findById(id: string): Promise<WatchlistItem | null>;
  findByUser(userId: string): Promise<WatchlistItem[]>;
  findAll(): Promise<WatchlistItem[]>;
  remove(id: string): Promise<void>;
}
```

#### `PriceHistoryRepository` (`src/domain/interfaces/repositories/PriceHistoryRepository.ts`)

> **Importante:** los tests de evaluadores revelan un método `getMin` que NO está en STEPS.md.

```ts
interface PriceHistoryRepository {
  saveSnapshot(snapshot: PriceSnapshot): Promise<void>;
  getLatest(productUrl: string): Promise<PriceSnapshot | null>;
  getHistory(productUrl: string, range: DateRange): Promise<PriceSnapshot[]>;
  getMin(productUrl: string, range: DateRange): Promise<Money | null>;
}
```

---

### Use Case `WatchlistAddition` (`src/domain/usecases/WatchlistAddition.ts`)

Constructor: `(watchlist: WatchlistRepository, history: PriceHistoryRepository, stores: Map<string, StoreProductLookup>, normalizer: Normalizer)`

| Test | Qué espera |
|------|------------|
| adds item and saves initial snapshot | `add({userId,productUrl,store})` → ítem con `title==='Test Monitor'`, `store==='amazon'`; `history.saved.length===1`; `price===1000` |
| throws ItemAlreadyTracked | segunda llamada mismo userId+url → lanza `ItemAlreadyTracked` |
| throws UnknownStore | store no registrado → lanza `UnknownStore` |
| throws ProductNotFound | store devuelve null → lanza `ProductNotFound` |

**Flujo:**
1. `watchlist.exists(userId, productUrl)` → si true → lanzar `ItemAlreadyTracked`.
2. Buscar en `stores` map → si no existe → lanzar `UnknownStore`.
3. `fetchOne(url)` → si null → lanzar `ProductNotFound`.
4. Normalizar → crear `WatchlistItem` y `PriceSnapshot` con `randomUUID()`.
5. Guardar ambos → devolver `WatchlistItem`.

---

### Use Case `WatchlistRemoval` (`src/domain/usecases/WatchlistRemoval.ts`)

Constructor: `(watchlist: WatchlistRepository)`

| Test | Qué espera |
|------|------------|
| removes an existing item | `remove('i1')` → `repo.removed` contiene `'i1'` |
| throws WatchlistItemNotFound | id inexistente → lanza `WatchlistItemNotFound` |

---

### Use Case `WatchlistView` (`src/domain/usecases/WatchlistView.ts`)

Constructor: `(watchlist: WatchlistRepository, history: PriceHistoryRepository)`

| Test | Qué espera |
|------|------------|
| returns views with currentPrice | `list('user-1')` → `[0].currentPrice.equals(price) === true` |
| returns null currentPrice when no snapshot | `currentPrice === null` |
| returns empty list when no items | `length === 0` |
| maps item fields to view | `{ id:'i1', productUrl, store:'amazon', title:'Monitor', addedAt }` |

**Flujo:** `findByUser(userId)` → `Promise.all` de `getLatest` por cada ítem → mapear a `WatchlistItemView`.

---

## Grupo 4 — Alerts

### Value Object `AlertCondition` (`src/domain/valueObjects/AlertCondition.ts`)

> Los kinds son `'PriceBelow'`, `'PriceAtMin'`, `'PriceDropPct'` (PascalCase, **no** SCREAMING_SNAKE_CASE como sugiere STEPS.md).

Exporta factory functions (no constructores de clase):
- `priceBelow(threshold: Money): AlertCondition`
- `priceAtMin(lookbackDays: number): AlertCondition`
- `priceDropPct(percent: number, lookbackDays: number): AlertCondition`

Y el tipo discriminado:
```ts
type AlertCondition =
  | { kind: 'PriceBelow'; threshold: Money }
  | { kind: 'PriceAtMin'; lookbackDays: number }
  | { kind: 'PriceDropPct'; percent: number; lookbackDays: number }
```

Importa `InvalidAlertCondition` de `src/domain/exceptions/AlertErrors`.

| Test — `priceBelow` | Qué espera |
|---------------------|------------|
| returns PriceBelow condition | `condition.kind === 'PriceBelow'`, `condition.threshold === threshold` |

| Test — `priceAtMin` | Qué espera |
|---------------------|------------|
| returns PriceAtMin with valid lookbackDays | `kind==='PriceAtMin'`, `lookbackDays===30` |
| accepts lookbackDays of 1 | no lanza |
| rejects lookbackDays of 0 | lanza `InvalidAlertCondition` |
| rejects negative lookbackDays | lanza `InvalidAlertCondition` |
| rejects non-integer lookbackDays | `1.5` lanza `InvalidAlertCondition` |

| Test — `priceDropPct` | Qué espera |
|-----------------------|------------|
| returns PriceDropPct with valid params | `kind==='PriceDropPct'`, `percent===10`, `lookbackDays===7` |
| accepts percent of exactly 100 | no lanza |
| rejects percent of 0 | lanza `InvalidAlertCondition` |
| rejects negative percent | lanza `InvalidAlertCondition` |
| rejects percent > 100 | lanza `InvalidAlertCondition` |
| rejects NaN percent | lanza `InvalidAlertCondition` |
| rejects lookbackDays of 0 | lanza `InvalidAlertCondition` |
| rejects non-integer lookbackDays | lanza `InvalidAlertCondition` |

---

### Entidad `Alert` (`src/domain/entities/Alert.ts`)

| Test | Qué espera |
|------|------------|
| builds with valid properties | `id`, `userId`, `active===true`, `lastTriggeredAt===null` |
| rejects empty productUrl | lanza `InvalidProductUrl` |
| trigger() returns new Alert with lastTriggeredAt | `triggered.lastTriggeredAt === at` |
| trigger() preserves all other fields | id, userId, productUrl, condition, active iguales |
| trigger() does not mutate original | `alert.lastTriggeredAt` sigue siendo `null` |

**Constructor:** `(id, userId, productUrl, condition: AlertCondition, active: boolean, lastTriggeredAt: Date | null)`

**Método `trigger(now: Date): Alert`** — retorna nueva instancia inmutable con `lastTriggeredAt = now`.

---

### Excepciones de Alerts (`src/domain/exceptions/AlertErrors.ts`)

| Nombre | Cuándo |
|--------|--------|
| `AlertNotFound` | alert no encontrado por id |
| `InvalidAlertCondition` | parámetros inválidos en AlertCondition |

---

### DTOs de Alerts
```
src/domain/dtos/alerts/CreateAlertRequest.ts → { userId, productUrl, condition: AlertCondition }
src/domain/dtos/alerts/AlertView.ts          → { id, productUrl, condition, active, lastTriggeredAt }
```

---

### Interfaces de Alerts

#### `AlertRepository` (`src/domain/interfaces/repositories/AlertRepository.ts`)
```ts
interface AlertRepository {
  save(alert: Alert): Promise<void>;
  findById(id: string): Promise<Alert | null>;
  findByUser(userId: string): Promise<Alert[]>;
  findActive(): Promise<Alert[]>;
  remove(id: string): Promise<void>;
}
```

#### `NotificationGateway` (`src/domain/interfaces/gateways/NotificationGateway.ts`)
```ts
interface NotificationGateway {
  notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void>;
}
```

#### `AlertConditionEvaluator` (`src/domain/interfaces/services/AlertConditionEvaluator.ts`)
```ts
interface AlertConditionEvaluator {
  readonly kind: AlertCondition['kind'];
  matches(condition: AlertCondition, snapshot: PriceSnapshot, history: PriceHistoryRepository): Promise<boolean>;
}
```

---

### Servicios de dominio (Evaluadores)

#### `PriceBelowEvaluator` (`src/domain/services/PriceBelowEvaluator.ts`)

Implementa `AlertConditionEvaluator`.

| Test | Qué espera |
|------|------------|
| returns true when price strictly below threshold | snapshot(400) vs threshold(600) → `true` |
| returns false when price equals threshold | snapshot(400) vs threshold(400) → `false` (no incluye igual) |
| returns false when price above threshold | snapshot(500) vs threshold(300) → `false` |
| returns false for different condition kind | `priceAtMin(7)` → `false` |
| exposes kind PriceBelow | `evaluator.kind === 'PriceBelow'` |

---

#### `PriceAtMinEvaluator` (`src/domain/services/PriceAtMinEvaluator.ts`)

Implementa `AlertConditionEvaluator`.

| Test | Qué espera |
|------|------------|
| returns true when price equals historical min | snapshot(400), histMin(400) → `true` |
| returns false when price above historical min | snapshot(400), histMin(300) → `false` |
| returns false when no historical min exists | histMin=null → `false` |
| returns false for different condition kind | `priceBelow(500)` → `false` |
| exposes kind PriceAtMin | `evaluator.kind === 'PriceAtMin'` |

**Lógica:** llama `history.getMin(url, range)` con un `DateRange` construido desde `priceAtMin.lookbackDays`. Compara `snapshot.price.equals(minPrice)`.

---

#### `PriceDropPctEvaluator` (`src/domain/services/PriceDropPctEvaluator.ts`)

Implementa `AlertConditionEvaluator`.

| Test | Qué espera |
|------|------------|
| returns true when drop equals required percent | history=[1000, 800], current=800, required=20% → `true` (80% de 1000 = 800) |
| returns true when drop exceeds required percent | history=[1000, 700], current=700, required=20% → `true` (30% > 20%) |
| returns false when drop less than required | history=[1000, 950], current=950, required=20% → `false` (5% < 20%) |
| returns false with fewer than 2 snapshots | 1 snapshot → `false` |
| returns false with empty history | 0 snapshots → `false` |
| returns false for different condition kind | `priceAtMin(7)` → `false` |
| exposes kind PriceDropPct | `evaluator.kind === 'PriceDropPct'` |

**Lógica:** llama `history.getHistory(url, range)`. Necesita ≥ 2 snapshots. Toma el primero como precio previo, calcula `percentDropFrom`. Si drop ≥ percent → true.

---

### Use Case `AlertCreation` (`src/domain/usecases/AlertCreation.ts`)

Constructor: `(alerts: AlertRepository)`

| Test | Qué espera |
|------|------------|
| creates alert that is active with no lastTriggeredAt | `active===true`, `lastTriggeredAt===null`, userId y productUrl correctos |
| persists in repository | `repo.saved.length===1` |
| generates unique id for each alert | dos llamadas → ids distintos |

---

### Use Case `AlertListing` (`src/domain/usecases/AlertListing.ts`)

Constructor: `(alerts: AlertRepository)`

| Test | Qué espera |
|------|------------|
| returns AlertViews for the given user | 3 alertas (2 user-1, 1 user-2) → 2 views para user-1 |
| returns empty array when no alerts | `length===0` |
| maps Alert fields to AlertView correctly | `{ id, productUrl, condition, active, lastTriggeredAt }` |

---

### Use Case `AlertRemoval` (`src/domain/usecases/AlertRemoval.ts`)

Constructor: `(alerts: AlertRepository)`

| Test | Qué espera |
|------|------------|
| removes an existing alert | `remove('a1')` → `repo.removed` contiene `'a1'` |
| throws AlertNotFound | id inexistente → lanza `AlertNotFound` |

---

### Use Case `AlertEvaluation` (`src/domain/usecases/AlertEvaluation.ts`)

Constructor: `(alerts: AlertRepository, history: PriceHistoryRepository, users: UserRepository, notifier: NotificationGateway, evaluators: Map<AlertCondition['kind'], AlertConditionEvaluator>)`

| Test | Qué espera |
|------|------------|
| notifies user and triggers alert when condition matches | `notifier.calls.length===1`, `alertRepo.saved[0].lastTriggeredAt !== null` |
| does not notify when condition does not match | `notifier.calls.length===0` |
| skips alert when no latest snapshot | `notifier.calls.length===0` |
| skips alert when user not found | `notifier.calls.length===0` |
| continues evaluating other alerts when one throws | falla la primera notificación → sigue con la segunda; `callCount===2`; `evaluate()` no lanza |

**Flujo:**
1. `findActive()` → todos los alerts activos.
2. `Promise.allSettled` por cada alert (fallos individuales no paran el batch).
3. Por alert: `getLatest(productUrl)` → si null, saltar.
4. Buscar evaluador por `condition.kind` → ejecutar `matches()`.
5. Si no matchea, saltar.
6. `users.findById(userId)` → si null, saltar.
7. `notifier.notify(user, alert, snapshot)` → guardar `alert.trigger(now)`.

---

## Grupo 5 — Price History

### Value Object `DateRange` (`src/domain/valueObjects/DateRange.ts`)

Importa `InvalidDateRange` de `src/domain/exceptions/DateRangeErrors.ts`.

| Test | Qué espera |
|------|------------|
| builds when from is before to | `range.from` y `range.to` correctos |
| accepts equal from and to | punto en el tiempo, no lanza |
| rejects when from is after to | lanza `InvalidDateRange` |
| contains() true for date inside range | `range.contains(new Date('2024-01-15')) === true` |
| contains() true on from boundary | inclusivo en from |
| contains() true on to boundary | inclusivo en to |
| contains() false before range | `false` |
| contains() false after range | `false` |
| lastDays() ends approximately now | `range.to.getTime()` dentro de la ventana `[before, after]` |
| lastDays() spans exactly N days | diferencia ≈ `N * 24 * 60 * 60 * 1000` ms |

**Contrato:**
- Constructor: `(from: Date, to: Date)`.
- Campos `readonly`: `from`, `to`.
- Método: `contains(date: Date): boolean` — inclusivo en ambos extremos.
- Static factory: `DateRange.lastDays(n: number): DateRange`.

---

### Excepciones y DTOs
```
src/domain/exceptions/DateRangeErrors.ts → InvalidDateRange extends DomainError
src/domain/dtos/priceHistory/HistoryQuery.ts → { productUrl: string, range: DateRange }
src/domain/dtos/priceHistory/PricePoint.ts   → { timestamp: Date, price: Money }
```

---

### Use Case `PriceHistoryQuery` (`src/domain/usecases/PriceHistoryQuery.ts`)

Constructor: `(history: PriceHistoryRepository)`

| Test | Qué espera |
|------|------------|
| maps snapshots to PricePoints | `points[0].timestamp === scrapedAt`, `points[0].price === price` |
| returns empty array when no snapshots | `length===0` |
| preserves the order of snapshots | primer precio 500, segundo 480 |

**Flujo:** `history.getHistory(productUrl, range)` → mapear `snapshot → { timestamp: snapshot.scrapedAt, price: snapshot.price }`.

---

### Use Case `PriceRefresh` (`src/domain/usecases/PriceRefresh.ts`)

Constructor: `(watchlist: WatchlistRepository, history: PriceHistoryRepository, stores: Map<string, StoreProductLookup>, normalizer: Normalizer)`

| Test | Qué espera |
|------|------------|
| saves a new snapshot for each item | `refresh()` → `history.saved.length===1`, `price===800` |
| skips item when store not registered | mapa vacío → `history.saved.length===0` |
| skips item when store returns null | → `history.saved.length===0` |
| continues when one item throws | 2 items, 1 falla → `history.saved.length===1`, `refresh()` no lanza |

**Flujo:**
1. `watchlist.findAll()`.
2. `Promise.allSettled` por cada ítem.
3. Por ítem: buscar store en map → si no existe, saltar.
4. `fetchOne(url)` → si null, saltar.
5. Normalizar → crear `PriceSnapshot` con `randomUUID()` → guardar.

---

## Resumen de archivos a crear

```
src/domain/exceptions/
  DomainError.ts
  SearchErrors.ts       (InvalidWeights, AllStoresFailed, ProductNotFound,
                         InvalidProductUrl, InvalidProduct, InvalidScore)
  UserErrors.ts         (InvalidEmail, InvalidPasswordHash, UserAlreadyExists, InvalidCredentials)
  WatchlistErrors.ts    (ItemAlreadyTracked, WatchlistItemNotFound, UnknownStore)
  AlertErrors.ts        (AlertNotFound, InvalidAlertCondition)
  DateRangeErrors.ts    (InvalidDateRange)

src/domain/valueObjects/
  Money.ts
  SearchWeights.ts
  Email.ts
  PasswordHash.ts
  DateRange.ts
  AlertCondition.ts

src/domain/entities/
  Product.ts
  User.ts
  WatchlistItem.ts
  PriceSnapshot.ts
  Alert.ts

src/domain/dtos/
  search/RawProduct.ts, SearchRequest.ts, SearchResponse.ts, RankedProduct.ts
  auth/RegistrationRequest.ts, LoginRequest.ts, AuthResponse.ts
  watchlist/AddItemRequest.ts, WatchlistItemView.ts
  alerts/CreateAlertRequest.ts, AlertView.ts
  priceHistory/HistoryQuery.ts, PricePoint.ts

src/domain/interfaces/
  stores/StoreProductSearch.ts, StoreProductLookup.ts, Store.ts
  services/Normalizer.ts, RankStrategy.ts, SearchCache.ts, AlertConditionEvaluator.ts
  repositories/UserRepository.ts, WatchlistRepository.ts, PriceHistoryRepository.ts, AlertRepository.ts
  gateways/AuthGateway.ts, PasswordGateway.ts, TokenGateway.ts, NotificationGateway.ts

src/domain/services/
  PriceBelowEvaluator.ts
  PriceAtMinEvaluator.ts
  PriceDropPctEvaluator.ts

src/domain/usecases/
  ProductSearch.ts
  UserRegistration.ts, UserLogin.ts, TokenRefresh.ts
  WatchlistAddition.ts, WatchlistRemoval.ts, WatchlistView.ts
  AlertCreation.ts, AlertListing.ts, AlertRemoval.ts, AlertEvaluation.ts
  PriceHistoryQuery.ts, PriceRefresh.ts
```
