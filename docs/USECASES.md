# Use Cases — Guía capa por capa

Cada grupo se documenta en orden bottom-up: primero las dependencias, luego el use case que las consume.  
**Regla de oro:** domain nunca importa de infrastructure.

---

## Grupo 0 — Base transversal

### `src/domain/exceptions/DomainError.ts`

Clase base abstracta que extiende `Error`. Todos los errores de dominio la extienden y agregan un campo `readonly code: string` para identificar el tipo de error sin depender de `instanceof` en las capas superiores. Sin lógica extra.

---

## Grupo 1 — ProductSearch

**El use case central.** Recibe una query y pesos, consulta múltiples tiendas en paralelo, normaliza los resultados crudos, los rankea por score, cachea y devuelve.

### Paso 1 — Value Objects

**`src/domain/valueObjects/Money.ts`**  
Envuelve un `Decimal` (de `decimal.js`) con una currency string. Usa aritmética exacta para evitar errores de punto flotante. Valida que el amount no sea negativo y que la currency sea exactamente 3 letras ISO. Expone `add`, `subtract`, `isLessThan`, `isGreaterThan`, `equals`, `percentDropFrom`.

**`src/domain/valueObjects/SearchWeights.ts`**  
Cuatro pesos `readonly`: `price`, `stock`, `delivery`, `msi`. El constructor valida que cada uno esté en `[0, 1]` y que los cuatro sumen `1.0` (tolerancia `EPSILON = 0.001`). Lanza `InvalidWeights` en cualquier violación. Dos static factories: `balanced()` (0.25 cada uno) y `priceFocused()` (0.70 / 0.10 / 0.10 / 0.10).

### Paso 2 — Entidad

**`src/domain/entities/Product.ts`**  
Representación de dominio de un producto ya normalizado. Campos: `id`, `title`, `price: Money`, `store`, `url`, `inStock: boolean`, `deliveryDays`, `msi`. Valida que `deliveryDays >= 0` y `msi >= 0`. Es inmutable — todos los campos son `readonly`.

### Paso 3 — Excepciones

**`src/domain/exceptions/SearchErrors.ts`**
- `AllStoresFailed` — ningún store devolvió productos para la query
- `ProductNotFound` — no se encontró un producto específico por URL
- `InvalidProduct` — datos de producto inválidos (deliveryDays negativo, etc.)
- `InvalidScore` — score fuera del rango [0, 1]
- `InvalidWeights` — pesos inválidos o que no suman 1

### Paso 4 — DTOs

**`src/domain/dtos/search/RawProduct.ts`**  
Lo que devuelve cualquier scraper o store adapter: todo son strings sin parsear (`priceText: "1299.00"`, `inStockText: "in stock"`, `deliveryText: "2 días"`). Sin validación ni lógica — es el dato crudo de entrada al pipeline.

**`src/domain/dtos/search/RankedProduct.ts`**  
Un producto normalizado más su `score: number` en [0, 1]. Valida que el score esté en rango. Es el resultado final del pipeline de búsqueda.

**`src/domain/dtos/search/SearchRequest.ts`**  
Input del use case: `{ query: string, weights: SearchWeights }`.

**`src/domain/dtos/search/SearchResponse.ts`**  
Output del use case: `{ query, results: RankedProduct[], fromCache: boolean }`.

### Paso 5 — Interfaces (puertos)

**`src/domain/interfaces/stores/StoreProductSearch.ts`**  
`readonly name: string` + `search(query: string): Promise<RawProduct[]>`. Puerto para buscar productos por texto. El use case no sabe si hay un scraper real o un mock detrás.

**`src/domain/interfaces/stores/StoreProductLookup.ts`**  
`readonly name: string` + `fetchOne(url: string): Promise<RawProduct | null>`. Puerto para consultar precio y stock de un producto por URL exacta.

**`src/domain/interfaces/stores/Store.ts`**  
`interface Store extends StoreProductSearch, StoreProductLookup {}`. Las implementaciones concretas (scrapers, mocks) implementan esta interfaz completa.

**`src/domain/interfaces/services/Normalizer.ts`**  
`normalize(raw: RawProduct): Product`. Convierte datos crudos en una entidad validada. La implementación vive en infrastructure (`BasicNormalizer`).

**`src/domain/interfaces/services/RankStrategy.ts`**  
`rank(products: Product[], weights: SearchWeights): RankedProduct[]`. Recibe productos normalizados y los devuelve ordenados con score. La implementación vive en infrastructure (`WeightedRankStrategy`).

**`src/domain/interfaces/services/SearchCache.ts`**  
`get(key)` y `set(key, response, ttlSeconds)`. El use case no sabe si el cache es Redis o un Map en memoria.

### Paso 6 — Use Case

**`src/domain/usecases/ProductSearch.ts`**  
Constructor: `stores: StoreProductSearch[]`, `normalizer`, `ranker`, `cache`, `cacheTtlSeconds`.

Flujo de `search(request)`:
```
1. buildCacheKey(query + cuatro pesos)
2. cache.get(key)           → si existe: return { ...cached, fromCache: true }
3. Promise.allSettled(stores.map(s => s.search(query)))  ← fan-out paralelo, tolera fallos
4. flatMap fulfilled         → agrega todos los RawProducts
5. rawProducts.length === 0  → throw AllStoresFailed
6. normalizer.normalize(raw) → Product (por cada raw)
7. ranker.rank(products, weights) → RankedProduct[] ordenados por score
8. cache.set(key, response, ttl)
9. return response
```

La clave de cache incluye query y los cuatro pesos — misma query con pesos distintos produce entradas separadas.

---

## Grupo 2 — Auth

Tres use cases que comparten las mismas dependencias: `UserRepository`, `PasswordGateway`, `TokenGateway`.

### Paso 1 — Value Objects

**`src/domain/valueObjects/Email.ts`**  
Wrappea un string. Normaliza a minúsculas y trim en el constructor. Valida formato con regex. Lanza `InvalidEmail`. Expone `readonly value: string` y `equals(other)`.

**`src/domain/valueObjects/PasswordHash.ts`**  
Branded type: `string & { readonly [brand]: 'PasswordHash' }`. No contiene el password — contiene el hash ya procesado. La función `asPasswordHash(value)` valida que tenga al menos 20 caracteres (mínimo plausible para un hash real) y hace el cast. Da type-safety sin overhead en runtime.

### Paso 2 — Entidad

**`src/domain/entities/User.ts`**  
Campos: `id`, `email: Email`, `passwordHash: PasswordHash`, `createdAt: Date`. Sin métodos de negocio en auth — es un contenedor de identidad. La lógica de autenticación vive en los gateways.

### Paso 3 — Excepciones

**`src/domain/exceptions/UserErrors.ts`**
- `InvalidEmail` — formato de email inválido
- `InvalidPasswordHash` — hash demasiado corto para ser válido
- `UserAlreadyExists` — intento de registro con email ya usado
- `InvalidCredentials` — login fallido (usuario no existe O password incorrecta — mismo error para no dar pistas)
- `InvalidToken` — token JWT inválido o expirado

### Paso 4 — DTOs

**`src/domain/dtos/auth/RegistrationRequest.ts`** → `{ email: string, password: string }`  
**`src/domain/dtos/auth/LoginRequest.ts`** → `{ email: string, password: string }`  
**`src/domain/dtos/auth/AuthResponse.ts`** → `{ userId, accessToken, refreshToken }`

### Paso 5 — Interfaces (puertos)

**`src/domain/interfaces/gateways/PasswordGateway.ts`**  
`hashPassword(plain)` y `verifyPassword(plain, hash)`. El dominio no sabe que se usa bcrypt.

**`src/domain/interfaces/gateways/TokenGateway.ts`**  
`createTokens(payload)`, `verifyAccessToken(token)`, `refresh(refreshToken)`. Define también los tipos `TokenPair` y `TokenPayload`. El dominio no sabe que se usa JWT.

**`src/domain/interfaces/gateways/AuthGateway.ts`**  
`type AuthGateway = PasswordGateway & TokenGateway`. Alias de conveniencia — `JwtBcryptAuthGateway` implementa las dos interfaces a la vez, por lo que puede usarse como `PasswordGateway` y `TokenGateway` al mismo tiempo.

**`src/domain/interfaces/repositories/UserRepository.ts`**  
`findById`, `findByEmail(email: Email)`, `save`. Acepta el value object `Email` en lugar de un string crudo para forzar que el llamador haya validado el email antes de consultar.

### Paso 6 — Use Cases

**`src/domain/usecases/UserRegistration.ts`**  
Flujo de `register(request)`:
```
1. new Email(request.email)         → valida formato, lanza InvalidEmail si falla
2. users.findByEmail(email)         → si existe → throw UserAlreadyExists
3. passwords.hashPassword(password) → string hash
4. asPasswordHash(hash)             → PasswordHash (type-safe)
5. new User(randomUUID(), email, passwordHash, new Date())
6. users.save(user)
7. tokens.createTokens({ userId, email }) → TokenPair
8. return AuthResponse
```

**`src/domain/usecases/UserLogin.ts`**  
Flujo de `login(request)`:
```
1. new Email(request.email)
2. users.findByEmail(email)           → si null → throw InvalidCredentials
3. passwords.verifyPassword(plain, hash) → si false → throw InvalidCredentials
   (mismo error en ambos casos — no revelar si el email existe)
4. tokens.createTokens({ userId, email })
5. return AuthResponse
```

**`src/domain/usecases/TokenRefresh.ts`**  
Delega completamente en `tokens.refresh(refreshToken)`. Sin lógica propia — es un wrapper que mantiene la frontera de capas limpia.

---

## Grupo 3 — Watchlist

Requiere Grupo 1 completo (`StoreProductLookup`, `Normalizer`, `Money`, `ProductNotFound`).

### Paso 1 — Entidades

**`src/domain/entities/WatchlistItem.ts`**  
Un producto que un usuario decidió rastrear. Campos: `id`, `userId`, `productUrl`, `store`, `title`, `addedAt`. Valida que `productUrl` no sea vacío. Inmutable.

**`src/domain/entities/PriceSnapshot.ts`**  
Una foto del precio de un producto en un momento dado. Campos: `id`, `productUrl`, `store`, `price: Money`, `scrapedAt: Date`. Es una entidad (no un DTO) porque tiene identidad propia y representa un hecho de negocio persistido — nunca se modifica, se crea uno nuevo cada vez.

### Paso 2 — Excepciones

**`src/domain/exceptions/WatchlistErrors.ts`**
- `ItemAlreadyTracked` — el usuario ya tiene ese producto en su watchlist
- `WatchlistItemNotFound` — se intentó operar sobre un item inexistente
- `UnknownStore` — se pidió una tienda que el sistema no conoce

### Paso 3 — DTOs

**`src/domain/dtos/watchlist/AddItemRequest.ts`** → `{ userId, productUrl, store }`  
**`src/domain/dtos/watchlist/WatchlistItemView.ts`** → campos del item + `currentPrice: Money | null`. El `null` indica que aún no hay historial de precios.

### Paso 4 — Interfaces (puertos)

**`src/domain/interfaces/repositories/WatchlistRepository.ts`**  
`exists(userId, productUrl)` — para verificar duplicados antes de agregar. `save`, `findById`, `findByUser`, `findAll`, `remove`.

**`src/domain/interfaces/repositories/PriceHistoryRepository.ts`**  
`saveSnapshot`, `getLatest(productUrl)` — precio actual, `getHistory(productUrl, range)` — para gráficas, `getMin(productUrl, range)` — para alertas de mínimo histórico.

### Paso 5 — Use Cases

**`src/domain/usecases/WatchlistAddition.ts`**  
Constructor: `watchlist`, `history`, `stores: Map<string, StoreProductLookup>`, `normalizer`.

Flujo de `add(request)`:
```
1. watchlist.exists(userId, productUrl) → throw ItemAlreadyTracked
2. stores.get(store)                    → throw UnknownStore si no existe
3. store.fetchOne(url)                  → throw ProductNotFound si null
4. normalizer.normalize(raw)            → Product
5. new WatchlistItem(...)  → watchlist.save(item)
6. new PriceSnapshot(...)  → history.saveSnapshot(snap)  ← primer precio registrado
7. return item
```

Guarda dos cosas en un `add`: el item y el primer snapshot. Así siempre hay al menos un precio histórico desde el momento en que se agrega.

**`src/domain/usecases/WatchlistRemoval.ts`**  
`remove(itemId)`: busca el item, lanza `WatchlistItemNotFound` si no existe, llama `watchlist.remove(id)`. No borra el historial de precios — ese dato histórico se conserva.

**`src/domain/usecases/WatchlistView.ts`**  
`list(userId)`: trae todos los items del usuario con `findByUser`, luego `Promise.all` para obtener el precio más reciente de cada uno en paralelo con `getLatest`. Mapea a `WatchlistItemView` con `currentPrice: latest?.price ?? null`.

---

## Grupo 4 — Alerts

Requiere Grupo 2 (User) y Grupo 3 (PriceSnapshot, PriceHistoryRepository).

### Paso 1 — Value Object

**`src/domain/valueObjects/AlertCondition.ts`**  
Discriminated union con tres variantes:
- `{ kind: 'PriceBelow', threshold: Money }` — se dispara cuando el precio baja de un umbral fijo
- `{ kind: 'PriceAtMin', lookbackDays: number }` — se dispara cuando el precio iguala el mínimo histórico en N días
- `{ kind: 'PriceDropPct', percent: number, lookbackDays: number }` — se dispara cuando el precio cae X% respecto al anterior en N días

Cada variante tiene su función factory (`priceBelow`, `priceAtMin`, `priceDropPct`) que valida los parámetros y lanza `InvalidAlertCondition`.

### Paso 2 — Entidad

**`src/domain/entities/Alert.ts`**  
Campos: `id`, `userId`, `productUrl`, `condition: AlertCondition`, `active: boolean`, `lastTriggeredAt: Date | null`. Método `trigger(at: Date): Alert` — devuelve una **nueva instancia** con `lastTriggeredAt` actualizado. Inmutable: nunca muta `this`, siempre retorna una copia.

### Paso 3 — Excepciones

**`src/domain/exceptions/AlertErrors.ts`**
- `AlertNotFound` — alert inexistente
- `InvalidAlertCondition` — parámetros inválidos en la condición (percent fuera de rango, lookbackDays negativo)

### Paso 4 — DTOs

**`src/domain/dtos/alerts/CreateAlertRequest.ts`** → `{ userId, productUrl, condition: AlertCondition }`  
**`src/domain/dtos/alerts/AlertView.ts`** → `{ id, productUrl, condition, active, lastTriggeredAt }`

### Paso 5 — Interfaces (puertos)

**`src/domain/interfaces/repositories/AlertRepository.ts`**  
`findById`, `findActive()` — todos los alerts activos (para el job del scheduler), `findByUser`, `save`, `remove`.

**`src/domain/interfaces/gateways/NotificationGateway.ts`**  
`notify(user, alert, snapshot)`. El dominio no sabe si la notificación es un email, SMS o log en consola.

**`src/domain/interfaces/services/AlertConditionEvaluator.ts`**  
`readonly kind: AlertCondition['kind']` + `matches(condition, snapshot, history): Promise<boolean>`. Cada variante de condición tiene su evaluador propio. El `kind` sirve como clave para el Map en `AlertEvaluation`.

### Paso 6 — Domain Services (evaluadores)

A diferencia de los otros grupos, aquí la lógica de evaluación es pura de dominio — no necesita infraestructura — por lo que las **implementaciones viven en `domain/services/`**, no en `infrastructure/`.

**`src/domain/services/PriceBelowEvaluator.ts`**  
Compara `snapshot.price.isLessThan(condition.threshold)`. No necesita historial.

**`src/domain/services/PriceAtMinEvaluator.ts`**  
Obtiene el precio mínimo del período con `history.getMin(url, range)` y compara con `snapshot.price.equals(min)`.

**`src/domain/services/PriceDropPctEvaluator.ts`**  
Trae el historial del período, toma el penúltimo snapshot como precio anterior y calcula `snapshot.price.percentDropFrom(previous.price) >= condition.percent`.

### Paso 7 — Use Cases

**`src/domain/usecases/AlertCreation.ts`**  
`create(request)`: construye un `Alert` con `randomUUID()`, `active: true`, `lastTriggeredAt: null`, lo guarda y lo devuelve.

**`src/domain/usecases/AlertListing.ts`**  
`list(userId)`: llama `findByUser`, mapea cada `Alert` a `AlertView` (proyección plana para el cliente).

**`src/domain/usecases/AlertRemoval.ts`**  
`remove(alertId)`: busca el alert, lanza `AlertNotFound` si no existe, llama `alerts.remove(id)`.

**`src/domain/usecases/AlertEvaluation.ts`**  
Constructor: `alerts`, `history`, `users`, `notifier`, `evaluators: Map<AlertCondition['kind'], AlertConditionEvaluator>`.

Flujo de `evaluate()` — llamado por el scheduler en cada tick:
```
1. alerts.findActive()                         → todos los alerts activos
2. Promise.allSettled(active.map(evaluateAlert)) ← un fallo no cancela los demás

Por cada alert:
3. history.getLatest(productUrl)  → si null, saltar
4. evaluators.get(condition.kind) → si no hay evaluador, saltar
5. evaluator.matches(...)         → si no matchea, saltar
6. users.findById(userId)         → si null, saltar
7. notifier.notify(user, alert, snapshot)
8. alerts.save(alert.trigger(new Date()))  ← marca lastTriggeredAt
```

El uso de `Promise.allSettled` en lugar de `Promise.all` garantiza que un error en la evaluación de un alert no bloquea el procesamiento de los demás.

---

## Grupo 5 — Price

Requiere Grupo 3 completo.

### Paso 1 — Value Object y DTOs

**`src/domain/valueObjects/DateRange.ts`**  
`from: Date` + `to: Date`. Valida que `from <= to`. Static factory `lastDays(n)` para construir un rango desde hace N días hasta ahora. Método `contains(date)` para filtros.

**`src/domain/dtos/priceHistory/HistoryQuery.ts`** → `{ productUrl: string, range: DateRange }`  
**`src/domain/dtos/priceHistory/PricePoint.ts`** → `{ timestamp: Date, price: Money }` — proyección simple de `PriceSnapshot` para el cliente.

### Paso 2 — Use Cases

**`src/domain/usecases/PriceHistoryQuery.ts`**  
El más simple del sistema. `query(request)`: llama `history.getHistory(productUrl, range)`, mapea cada `PriceSnapshot` a `PricePoint` (`{ timestamp: s.scrapedAt, price: s.price }`). Solo proyecta — sin lógica de negocio.

**`src/domain/usecases/PriceRefresh.ts`**  
Constructor: `watchlist`, `history`, `stores: Map<string, StoreProductLookup>`, `normalizer`. Llamado por el scheduler periódicamente.

Flujo de `refresh()`:
```
1. watchlist.findAll()                           → todos los items de todos los usuarios
2. Promise.allSettled(items.map(refreshItem))    ← un fallo no cancela los demás

Por cada item:
3. stores.get(item.store)   → si no existe, saltar (store desconocida)
4. store.fetchOne(item.url) → si null, saltar (producto no disponible)
5. normalizer.normalize(raw) → Product
6. new PriceSnapshot(randomUUID(), url, store, product.price, new Date())
7. history.saveSnapshot(snapshot)
```

La diferencia con `WatchlistAddition`: aquí los errores individuales se silencian (`allSettled`) porque un error de red en una tienda no debe impedir actualizar los demás precios.

---

## Resumen de dependencias entre grupos

```
Grupo 0 (DomainError)
    └── Grupo 1 (ProductSearch) ──── Money, Normalizer, StoreProductLookup
            └── Grupo 3 (Watchlist) ─── WatchlistRepository, PriceHistoryRepository
                    └── Grupo 4 (Alerts) ── AlertRepository, NotificationGateway
                            └── Grupo 5 (Price) ─── DateRange, PriceHistoryQuery, PriceRefresh

Grupo 2 (Auth) ─── independiente, solo depende de Grupo 0
```

## Por qué cada cosa está donde está

| Tipo | Vive en | Razón |
|---|---|---|
| `Money`, `Email`, `SearchWeights` | `valueObjects/` | Tienen invariantes, sin identidad |
| `Product`, `User`, `Alert`, `WatchlistItem`, `PriceSnapshot` | `entities/` | Tienen identidad (`id`) y/o invariantes |
| `RawProduct`, `SearchRequest`, `AuthResponse` | `dtos/` | Solo transportan datos, sin validación |
| `PriceBelowEvaluator`, `PriceAtMinEvaluator`, `PriceDropPctEvaluator` | `domain/services/` | Lógica pura de dominio, sin dependencia de infraestructura |
| `BasicNormalizer`, `WeightedRankStrategy`, `JwtBcryptAuthGateway` | `infrastructure/repositories/` | Implementan puertos del dominio usando librerías externas |
