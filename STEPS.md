# Guía de implementación — Use Cases

Orden bottom-up: siempre construyes las dependencias antes del use case que las necesita.
Regla de oro: **domain nunca importa de infrastructure**.

---

## Grupo 0 — Base transversal

Estos archivos no pertenecen a ningún use case concreto pero los necesitan casi todos.
Créalos primero.

```
src/domain/exceptions/DomainError.ts
```

- Clase base abstracta que extiende `Error`.
- Todos los demás errores de dominio la extienden.
- Sin lógica extra, solo establece el tipo base.

---

## Grupo 1 — ProductSearch

**El use case central del sistema.** Recibe una query y pesos, consulta múltiples tiendas en
paralelo, normaliza, rankea, cachea y devuelve resultados.

### Paso 1 — Value Objects

```
src/domain/valueObjects/SearchWeights.ts
```

- Cuatro campos `readonly`: `price`, `stock`, `delivery`, `msi`.
- Constructor valida que cada uno esté en `[0, 1]` y que los cuatro sumen `1.0` (usa `EPSILON = 0.001`).
- Dos static factories: `balanced()` (0.25 c/u) y `priceFocused()` (0.7 / 0.1 / 0.1 / 0.1).
- Lanza `InvalidWeights` en cualquier violación.

```
src/domain/valueObjects/Money.ts
```

- Wrappea un `Decimal` (de `decimal.js`) con una currency string.
- Valida que el amount no sea negativo.
- Expone métodos de comparación: `isGreaterThan`, `isLessThan`, `equals`.
- Lanza `InvalidAmount` si el valor es negativo.

### Paso 2 — Excepciones

```
src/domain/exceptions/SearchErrors.ts
```

- `AllStoresFailed` — ninguna tienda devolvió resultados.
- `ProductNotFound` — no se encontró un producto específico por URL.

### Paso 3 — DTOs

```
src/domain/dtos/search/SearchRequest.ts
```
- `query: string`
- `weights: SearchWeights`

```
src/domain/dtos/search/RankedProduct.ts
```
- Producto ya normalizado y con su score calculado: `title`, `price` (Money), `store`,
  `url`, `stock`, `deliveryDays`, `msiMonths`, `score`.

```
src/domain/dtos/search/SearchResponse.ts
```
- `query: string`
- `results: RankedProduct[]`
- `fromCache: boolean`

### Paso 4 — DTO de tienda y gateways de store

```
src/domain/dtos/search/RawProduct.ts
```
- Tipo plano con los campos crudos que devuelve cualquier tienda externa:
  `title`, `priceText`, `currency`, `store`, `url`, `inStockText`, `deliveryText`, `msiText`.
- Vive en `dtos/` porque es el dato de entrada al flujo de normalización, no un contrato de puerto.

```
src/domain/interfaces/stores/StoreProductSearch.ts
```
- `readonly name: string` + `search(query: string): Promise<RawProduct[]>`.
- Puerto para buscar productos en una tienda por texto. Vive en `stores/` porque representa el concepto de dominio "tienda que devuelve productos".

```
src/domain/interfaces/stores/StoreProductLookup.ts
```
- `readonly name: string` + `fetchOne(url: string): Promise<RawProduct | null>`.
- Puerto para consultar precio y stock de un producto por URL. Vive en `stores/` por la misma razón.

```
src/domain/interfaces/stores/Store.ts
```
- `interface Store extends StoreProductSearch, StoreProductLookup {}`.
- Interface completa de tienda: combina búsqueda y consulta de producto. Las implementaciones concretas (scrapers, mocks) la implementan.

### Paso 5 — Interfaces de servicios

```
src/domain/interfaces/services/Normalizer.ts
```
- `normalize(raw: RawProduct): RankedProduct` (sin score aún, o con score = 0).

```
src/domain/interfaces/services/RankStrategy.ts
```
- `rank(products: RankedProduct[], weights: SearchWeights): RankedProduct[]`

```
src/domain/interfaces/services/SearchCache.ts
```
- `get(key: string): Promise<SearchResponse | null>`
- `set(key: string, value: SearchResponse, ttlSeconds: number): Promise<void>`

### Paso 6 — Use case

```
src/domain/usecases/ProductSearch.ts
```

Constructor recibe: `stores: StoreProductSearch[]`, `normalizer`, `ranker`, `cache`, `cacheTtlSeconds`.

Flujo de `search(request)`:
1. Construir clave de caché a partir de `query` + los cuatro pesos.
2. Si hay hit en caché → devolver con `fromCache: true`.
3. `Promise.allSettled` sobre todos los stores → aplanar resultados fulfilled.
4. Si `rawProducts` está vacío → lanzar `AllStoresFailed`.
5. Normalizar cada raw → rankear → construir `SearchResponse` con `fromCache: false`.
6. Guardar en caché y devolver.

---

## Grupo 2 — Auth (UserRegistration · UserLogin · TokenRefresh)

Los tres comparten dependencias; impleméntalos juntos.

### Paso 1 — Value Objects

```
src/domain/valueObjects/Email.ts
```
- Wrappea un string. Valida formato de email con regex en el constructor.
- Expone `readonly value: string`.
- Lanza `InvalidEmail`.

```
src/domain/valueObjects/PasswordHash.ts
```
- Branded type (`{ readonly __brand: 'PasswordHash' } & string`) o clase thin wrapper.
- No valida contenido (ya viene hasheado). Solo da type-safety.
- Expone `asPasswordHash(s: string): PasswordHash` como cast.

### Paso 2 — Entidad

```
src/domain/entities/User.ts
```
- Campos: `id: string`, `email: Email`, `passwordHash: PasswordHash`, `createdAt: Date`.
- Sin métodos de negocio en este grupo (los necesitará AlertEvaluation pero no auth).

### Paso 3 — Excepciones

```
src/domain/exceptions/UserErrors.ts
```
- `UserAlreadyExists`
- `InvalidCredentials`
- `InvalidEmail` (puede vivir aquí o en un archivo de VO errors)

### Paso 4 — DTOs

```
src/domain/dtos/auth/RegistrationRequest.ts  → { email: string, password: string }
src/domain/dtos/auth/LoginRequest.ts         → { email: string, password: string }
src/domain/dtos/auth/AuthResponse.ts         → { userId, accessToken, refreshToken }
```

### Paso 5 — Interfaces

```
src/domain/interfaces/repositories/UserRepository.ts
```
- `findByEmail(email: Email): Promise<User | null>`
- `findById(id: string): Promise<User | null>`
- `save(user: User): Promise<void>`

```
src/domain/interfaces/gateways/PasswordGateway.ts
```
- `hashPassword(plain: string): Promise<string>`
- `verifyPassword(plain: string, hash: PasswordHash): Promise<boolean>`

```
src/domain/interfaces/gateways/TokenGateway.ts
```
- `createTokens(payload): Promise<TokenPair>`
- `refresh(refreshToken: string): Promise<TokenPair>`
- Tipo `TokenPair = { accessToken: string, refreshToken: string }`.

### Paso 6 — Use cases

```
src/domain/usecases/UserRegistration.ts
```
1. Construir `Email` (valida en constructor).
2. Verificar que no exista → lanzar `UserAlreadyExists`.
3. Hashear password → crear `User` con `randomUUID()` → guardar.
4. Crear tokens → devolver `AuthResponse`.

```
src/domain/usecases/UserLogin.ts
```
1. Construir `Email`.
2. Buscar usuario → si no existe lanzar `InvalidCredentials`.
3. Verificar password → si falla lanzar `InvalidCredentials` (mismo error, no distinguir).
4. Crear tokens → devolver `AuthResponse`.

```
src/domain/usecases/TokenRefresh.ts
```
- Delega completamente en `TokenGateway.refresh`. Sin lógica extra.

---

## Grupo 3 — Watchlist (WatchlistAddition · WatchlistRemoval · WatchlistView)

Requiere que el Grupo 1 esté completo (reutiliza `StoreProductLookup`, `Normalizer`, `Money`).

### Paso 1 — Entidades

```
src/domain/entities/WatchlistItem.ts
```
- `id`, `userId`, `productUrl`, `store`, `title`, `addedAt`.
- Sin métodos de negocio.

```
src/domain/entities/PriceSnapshot.ts
```
- `id`, `productUrl`, `store`, `price: Money`, `scrapedAt: Date`.

### Paso 2 — Excepciones

```
src/domain/exceptions/WatchlistErrors.ts
```
- `ItemAlreadyTracked`
- `WatchlistItemNotFound`
- `UnknownStore`

### Paso 3 — DTOs

```
src/domain/dtos/watchlist/AddItemRequest.ts   → { userId, productUrl, store }
src/domain/dtos/watchlist/WatchlistItemView.ts → { id, productUrl, store, title, addedAt, currentPrice: Money | null }
```

### Paso 4 — Interfaces

```
src/domain/interfaces/repositories/WatchlistRepository.ts
```
- `exists(userId, productUrl): Promise<boolean>`
- `save(item: WatchlistItem): Promise<void>`
- `findById(id: string): Promise<WatchlistItem | null>`
- `findByUser(userId: string): Promise<WatchlistItem[]>`
- `findAll(): Promise<WatchlistItem[]>`
- `remove(id: string): Promise<void>`

```
src/domain/interfaces/repositories/PriceHistoryRepository.ts
```
- `saveSnapshot(snapshot: PriceSnapshot): Promise<void>`
- `getLatest(productUrl: string): Promise<PriceSnapshot | null>`
- `getHistory(productUrl: string, range: DateRange): Promise<PriceSnapshot[]>`

### Paso 5 — Use cases

```
src/domain/usecases/WatchlistAddition.ts
```
1. Verificar que no exista ya el ítem → lanzar `ItemAlreadyTracked`.
2. Buscar store en el `Map<string, StoreProductLookup>` → lanzar `UnknownStore` si no existe.
3. `fetchOne(url)` → lanzar `ProductNotFound` si devuelve `null`.
4. Normalizar → crear `WatchlistItem` y `PriceSnapshot` con `randomUUID()`.
5. Guardar ambos → devolver el `WatchlistItem`.

```
src/domain/usecases/WatchlistRemoval.ts
```
1. Buscar ítem por id → lanzar `WatchlistItemNotFound` si no existe.
2. Llamar `watchlist.remove(id)`.

```
src/domain/usecases/WatchlistView.ts
```
1. `findByUser(userId)` → para cada ítem, obtener `getLatest(productUrl)`.
2. Mapear a `WatchlistItemView` con `currentPrice: latest?.price ?? null`.
3. Usar `Promise.all` para las llamadas paralelas al history.

---

## Grupo 4 — Alerts (AlertCreation · AlertListing · AlertRemoval · AlertEvaluation)

Requiere Grupo 2 (User) y Grupo 3 (PriceSnapshot, PriceHistoryRepository).

### Paso 1 — Value Object

```
src/domain/valueObjects/AlertCondition.ts
```
- Discriminated union: `{ kind: 'BELOW_PRICE', threshold: Money }` | `{ kind: 'DROP_PERCENT', percent: number }`.
- Validar que `percent` esté en `(0, 100]` para DROP_PERCENT.
- Lanza `InvalidAlertCondition`.

### Paso 2 — Entidad

```
src/domain/entities/Alert.ts
```
- `id`, `userId`, `productUrl`, `condition: AlertCondition`, `active: boolean`, `lastTriggeredAt: Date | null`.
- Método `trigger(now: Date): Alert` → devuelve una nueva instancia con `active: false` y `lastTriggeredAt: now`.

### Paso 3 — Excepciones

```
src/domain/exceptions/AlertErrors.ts
```
- `AlertNotFound`
- `InvalidAlertCondition`

### Paso 4 — DTOs

```
src/domain/dtos/alerts/CreateAlertRequest.ts → { userId, productUrl, condition: AlertCondition }
src/domain/dtos/alerts/AlertView.ts          → { id, productUrl, condition, active, lastTriggeredAt }
```

### Paso 5 — Interfaces

```
src/domain/interfaces/repositories/AlertRepository.ts
```
- `save(alert: Alert): Promise<void>`
- `findById(id: string): Promise<Alert | null>`
- `findByUser(userId: string): Promise<Alert[]>`
- `findActive(): Promise<Alert[]>`
- `remove(id: string): Promise<void>`

```
src/domain/interfaces/gateways/NotificationGateway.ts
```
- `notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void>`

```
src/domain/interfaces/services/AlertConditionEvaluator.ts
```
- `matches(condition: AlertCondition, snapshot: PriceSnapshot, history: PriceHistoryRepository): Promise<boolean>`

### Paso 6 — Use cases

```
src/domain/usecases/AlertCreation.ts
```
1. Construir `Alert` con `randomUUID()`, `active: true`, `lastTriggeredAt: null`.
2. Guardar → devolver la entidad.

```
src/domain/usecases/AlertListing.ts
```
1. `findByUser(userId)` → mapear a `AlertView`.

```
src/domain/usecases/AlertRemoval.ts
```
1. Buscar por id → lanzar `AlertNotFound` si no existe.
2. Llamar `alerts.remove(id)`.

```
src/domain/usecases/AlertEvaluation.ts
```
Constructor recibe: `alerts`, `history`, `users`, `notifier`, `evaluators: Map<kind, AlertConditionEvaluator>`.

Flujo de `evaluate()`:
1. Obtener todos los alerts activos.
2. `Promise.allSettled` sobre cada uno (un fallo no cancela los demás).
3. Por cada alert: obtener `getLatest` → si null, saltar.
4. Ejecutar evaluador según `condition.kind` → si no matchea, saltar.
5. Buscar user → si no existe, saltar.
6. Notificar → guardar alert con `.trigger(now)`.

---

## Grupo 5 — Price (PriceHistoryQuery · PriceRefresh)

Requiere Grupo 3 completo. Son los más simples de implementar.

### Paso 1 — Value Object y DTOs

```
src/domain/valueObjects/DateRange.ts
```
- `from: Date`, `to: Date`. Valida que `from <= to`. Lanza `InvalidDateRange`.

```
src/domain/exceptions/DateRangeErrors.ts  → InvalidDateRange
src/domain/dtos/priceHistory/HistoryQuery.ts → { productUrl: string, range: DateRange }
src/domain/dtos/priceHistory/PricePoint.ts   → { timestamp: Date, price: Money }
```

### Paso 2 — Use cases

```
src/domain/usecases/PriceHistoryQuery.ts
```
1. Llamar `history.getHistory(productUrl, range)`.
2. Mapear cada snapshot a `{ timestamp: s.scrapedAt, price: s.price }`.

```
src/domain/usecases/PriceRefresh.ts
```
Constructor recibe: `watchlist`, `history`, `stores: Map<string, StoreProductLookup>`, `normalizer`.

Flujo de `refresh()`:
1. `findAll()` → obtener todos los ítems del watchlist.
2. `Promise.allSettled` para cada ítem (fallos individuales no detienen el batch).
3. Por ítem: buscar store en el Map → si no existe, saltar.
4. `fetchOne(url)` → si null, saltar.
5. Normalizar → crear `PriceSnapshot` → guardar.

---

## Resumen de orden de implementación

```
Grupo 0  →  DomainError

Grupo 1  →  SearchWeights, Money
         →  SearchErrors
         →  SearchRequest, RankedProduct, SearchResponse, RawProduct
         →  StoreProductSearch, StoreProductLookup, Store
         →  Normalizer, RankStrategy, SearchCache
         →  ProductSearch ✓

Grupo 2  →  Email, PasswordHash
         →  User
         →  UserErrors
         →  RegistrationRequest, LoginRequest, AuthResponse
         →  UserRepository, PasswordGateway, TokenGateway
         →  UserRegistration, UserLogin, TokenRefresh ✓

Grupo 3  →  WatchlistItem, PriceSnapshot
         →  WatchlistErrors
         →  AddItemRequest, WatchlistItemView
         →  WatchlistRepository, PriceHistoryRepository
         →  WatchlistAddition, WatchlistRemoval, WatchlistView ✓

Grupo 4  →  AlertCondition
         →  Alert
         →  AlertErrors
         →  CreateAlertRequest, AlertView
         →  AlertRepository, NotificationGateway, AlertConditionEvaluator
         →  AlertCreation, AlertListing, AlertRemoval, AlertEvaluation ✓

Grupo 5  →  DateRange, DateRangeErrors
         →  HistoryQuery, PricePoint
         →  PriceHistoryQuery, PriceRefresh ✓
```
