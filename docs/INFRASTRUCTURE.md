# Capa de Infraestructura

La infraestructura implementa los contratos definidos en `domain/interfaces/`. Aquí viven Express, JWT, bcrypt, los stores (scrapers o mocks), el cache, y el scheduler.

**Regla:** Infraestructura importa de dominio. Dominio nunca importa de infraestructura.

---

## Controllers (HTTP Handlers)

Cada controller gestiona un recurso. Todos usan el mismo patrón:
1. Parsean el `req.body` / `req.params` / `req.query`.
2. Construyen los objetos de dominio necesarios (value objects, DTOs).
3. Llaman al use case correspondiente.
4. Devuelven la respuesta HTTP.
5. En caso de error, llaman a `next(err)` para que el `errorHandler` lo procese.

---

### AuthController
**Archivo:** `src/infrastructure/controller/AuthController.ts`

| Método | Ruta | Use case |
|---|---|---|
| `POST` | `/auth/register` | `UserRegistration.register()` |
| `POST` | `/auth/login` | `UserLogin.login()` |
| `POST` | `/auth/refresh` | `TokenRefresh.refresh()` |

---

### SearchController
**Archivo:** `src/infrastructure/controller/SearchController.ts`

| Método | Ruta | Use case |
|---|---|---|
| `POST` | `/search` | `ProductSearch.search()` |

Parsea los pesos opcionales del body. Si no se envían, usa los default `0.25` para cada uno:

```typescript
const w = req.body.weights ?? {};
const weights = new SearchWeights(
  w.price    ?? 0.25,
  w.stock    ?? 0.25,
  w.delivery ?? 0.25,
  w.msi      ?? 0.25,
);
```

---

### WatchlistController
**Archivo:** `src/infrastructure/controller/WatchlistController.ts`

Requiere autenticación (`requireAuth` middleware). Lee `req.userId` que fue inyectado por el middleware.

| Método | Ruta | Use case |
|---|---|---|
| `POST` | `/watchlist` | `WatchlistAddition.add()` |
| `DELETE` | `/watchlist/:id` | `WatchlistRemoval.remove()` |
| `GET` | `/watchlist` | `WatchlistView.view()` |

---

### AlertController
**Archivo:** `src/infrastructure/controller/AlertController.ts`

Requiere autenticación. Parsea la condición del body según el `kind`:

```typescript
// kind: 'PriceBelow'  → necesita: amount, currency
// kind: 'PriceAtMin'  → necesita: lookbackDays
// kind: 'PriceDropPct' → necesita: percent, lookbackDays
```

Si `kind` es desconocido → lanza `InvalidAlertCondition`.

| Método | Ruta | Use case |
|---|---|---|
| `POST` | `/alerts` | `AlertCreation.create()` |
| `DELETE` | `/alerts/:id` | `AlertRemoval.remove()` |
| `GET` | `/alerts` | `AlertListing.list()` |

---

### PriceHistoryController
**Archivo:** `src/infrastructure/controller/PriceHistoryController.ts`

Requiere autenticación. Lee `productUrl`, `from`, y `to` del query string.

| Método | Ruta | Use case |
|---|---|---|
| `GET` | `/price-history` | `PriceHistoryQuery.query()` |

---

## HTTP Middleware

### AuthMiddleware
**Archivo:** `src/infrastructure/http/AuthMiddleware.ts`

Extrae y valida el Bearer token en cada ruta protegida.

1. Lee el header `Authorization`.
2. Si no existe o no empieza con `Bearer ` → responde `401 MISSING_TOKEN`.
3. Extrae el token y llama `tokens.verifyAccessToken(token)`.
4. Si el token es inválido/expirado → responde `401 INVALID_TOKEN`.
5. Si es válido → inyecta `req.userId = payload.userId` y llama `next()`.

```typescript
// Express types augmentado en src/infrastructure/http/ExpressTypes.d.ts
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
```

---

### ErrorHandler
**Archivo:** `src/infrastructure/http/ErrorHandler.ts`

Middleware de error de Express (4 parámetros: `err, req, res, next`). Es el último middleware registrado en `app.ts`.

**Si el error es una `DomainError`:**
- Busca el `code` en `STATUS_BY_CODE`.
- Responde con el HTTP status correspondiente y body `{ error: { code, message } }`.

**Si el error es desconocido:**
- Loguea en consola.
- Responde `500 INTERNAL_ERROR`.

**Tabla de mapeo `code` → HTTP status:**

| Code | Status | Significado |
|---|---|---|
| `USER_ALREADY_EXISTS` | 409 | Email ya registrado |
| `USER_NOT_FOUND` | 404 | Usuario no encontrado |
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos |
| `INVALID_TOKEN` | 401 | Token inválido o expirado |
| `INVALID_EMAIL` | 400 | Formato de email inválido |
| `INVALID_MONEY` | 400 | Precio negativo o moneda inválida |
| `INVALID_DATE_RANGE` | 400 | Rango de fechas inválido |
| `ITEM_ALREADY_TRACKED` | 409 | Producto ya en watchlist |
| `WATCHLIST_ITEM_NOT_FOUND` | 404 | Item no encontrado |
| `UNKNOWN_STORE` | 400 | Tienda no soportada |
| `ALERT_NOT_FOUND` | 404 | Alerta no encontrada |
| `INVALID_ALERT_CONDITION` | 400 | Condición de alerta inválida |
| `ALL_STORES_FAILED` | 502 | Todas las tiendas fallaron |
| `INVALID_WEIGHTS` | 400 | Pesos no suman 1.0 o fuera de rango |
| `PRODUCT_NOT_FOUND` | 404 | Producto no encontrado en URL |

---

## Repositorios (In-Memory)

Todas las implementaciones guardan datos en memoria (`Map` de JavaScript). Son suficientes para desarrollo y testing; en producción se reemplazarían por implementaciones con base de datos.

### InMemoryUserRepository
**Archivo:** `src/infrastructure/repositories/InMemoryUserRepository.ts`

Dos índices internos:
- `Map<id, User>` — búsqueda por ID en O(1).
- `Map<email.value, User>` — búsqueda por email en O(1).

`save()` inserta o actualiza en ambos mapas.

---

### InMemoryAlertRepository
**Archivo:** `src/infrastructure/repositories/InMemoryAlertRepository.ts`

Un único `Map<id, Alert>`.

- `findActive()` → filtra `alert.active === true`.
- `findByUser(userId)` → filtra por `alert.userId`.
- `remove(id)` → `Map.delete(id)`. Lanza `AlertNotFound` si no existe.

---

### InMemoryWatchlistRepository
**Archivo:** `src/infrastructure/repositories/InMemoryWatchlistRepository.ts`

Un único `Map<id, WatchlistItem>`.

- `exists(userId, productUrl)` → itera el mapa buscando coincidencia en ambos campos.
- `findByUser(userId)` → filtra por `userId`.
- `findAll()` → devuelve todos los valores.

---

### InMemoryPriceHistoryRepository
**Archivo:** `src/infrastructure/repositories/InMemoryPriceHistoryRepository.ts`

Un único `Map<id, PriceSnapshot>` con los snapshots ordenados por `capturedAt`.

- `getLatest(productUrl)` → filtra por URL y devuelve el más reciente.
- `getHistory(productUrl, range)` → filtra por URL y rango de fechas.
- `getMin(productUrl, range)` → filtra y devuelve el `Money` con el menor `amount`.

---

### InMemorySearchCache
**Archivo:** `src/infrastructure/repositories/InMemorySearchCache.ts`

Cache con TTL. Internamente guarda `{ value, expiresAt }`.

- `get(key)` → si existe y no expiró, devuelve el valor. Si expiró, elimina la entrada y devuelve `null`.
- `set(key, value, ttlSeconds)` → guarda con `expiresAt = Date.now() + ttlSeconds * 1000`.

---

## Gateways

### JwtBcryptAuthGateway
**Archivo:** `src/infrastructure/repositories/JwtBcryptAuthGateway.ts`

Implementa `AuthGateway` (= `TokenGateway & PasswordGateway`).

**Tokens:**
- Access token: `jwt.sign(payload, secret, { expiresIn: '15m' })`
- Refresh token: `jwt.sign(payload, secret, { expiresIn: '7d' })`
- `verifyAccessToken` y `verifyRefreshToken` usan `jwt.verify`. Si falla → `InvalidToken`.

**Passwords:**
- `hashPassword(plain)` → `bcrypt.hash(plain, 10)` (10 salt rounds)
- `verifyPassword(plain, hash)` → `bcrypt.compare(plain, hash)`

**Config recibida en constructor:**
```typescript
{
  secret: string,
  accessTtl: string,    // ej: '15m'
  refreshTtl: string,   // ej: '7d'
}
```

---

### ConsoleNotificationGateway
**Archivo:** `src/infrastructure/repositories/ConsoleNotificationGateway.ts`

Implementación placeholder de `NotificationGateway`. Solo hace `console.log` con los detalles de la alerta.

En producción se reemplazaría por una implementación que envíe email, SMS, o push notification.

---

## Servicios de Infraestructura

### BasicNormalizer
**Archivo:** `src/infrastructure/repositories/BasicNormalizer.ts`

Implementa `Normalizer`. Convierte `RawProduct` → `Product`.

**Lógica de parsing:**
- `price`: si es string, extrae dígitos y construye `new Money(amount, 'MXN')`.
- `stockText`: busca "stock" (case-insensitive) → `inStock = true`.
- `deliveryText`: extrae el primer número → `deliveryDays`. Si no hay texto → 0.
- `msiText`: extrae el primer número → `msi`. Si no hay texto → 0.

Usa helpers de `src/infrastructure/stores/textUtils.ts`.

---

### WeightedRankStrategy
**Archivo:** `src/infrastructure/repositories/WeightedRankStrategy.ts`

Implementa `RankStrategy`. Calcula un score [0,1] para cada producto.

**Fórmula:**

```
score = priceScore * weights.price
      + stockScore * weights.stock
      + deliveryScore * weights.delivery
      + msiScore * weights.msi
```

**Cálculo de cada sub-score:**

| Sub-score | Fórmula | Descripción |
|---|---|---|
| `priceScore` | `1 - (price - priceMin) / priceRange` | 1.0 = precio más bajo, 0.0 = precio más alto |
| `stockScore` | `inStock ? 1 : 0` | Binario |
| `deliveryScore` | `max(0, 1 - deliveryDays / 14)` | 14 días → score 0, 0 días → score 1 |
| `msiScore` | `min(msi, 24) / 24` | 24+ meses → score 1.0 |

El score final se clampea a [0, 1] con `Math.max(0, Math.min(1, score))`.

Los productos se ordenan descendente por score (mejor primero).

---

## Stores

### MockAmazonStore / MockMercadoLibreStore
**Archivos:** `src/infrastructure/repositories/MockAmazonStore.ts`, `MockMercadoLibreStore.ts`

Generan productos ficticios para desarrollo y testing. Implementan tanto `SearchableStore` como `FetchableStore`.

- `search(query)` → devuelve N productos con precios aleatorios.
- `fetchOne(url)` → devuelve un producto mock basado en la URL.

---

### AmazonScraperStore
**Archivo:** `src/infrastructure/stores/AmazonScraperStore.ts`

Scraper real para `amazon.com.mx` usando Cheerio.

**`search(query)`:**
1. Construye URL de búsqueda: `https://www.amazon.com.mx/s?k={query}`.
2. Fetch HTTP con headers de navegador (User-Agent, etc.).
3. Parsea con Cheerio los selectores de resultados.
4. Extrae título, precio, URL, stock y delivery por cada ítem.
5. Devuelve array de `RawProduct`.

**`fetchOne(url)`:**
1. Fetch de la página del producto.
2. Parsea precio, título, stock, delivery, y MSI offers.
3. Devuelve `RawProduct | null`.

---

### MercadoLibreScraperStore
**Archivo:** `src/infrastructure/stores/MercadoLibreScraperStore.ts`

Scraper real para `mercadolibre.com.mx`. Misma estructura que `AmazonScraperStore` pero con selectores específicos de MercadoLibre.

---

### textUtils.ts
**Archivo:** `src/infrastructure/stores/textUtils.ts`

Helpers de parsing de texto usados por `BasicNormalizer` y los scrapers:

```typescript
normalizeText(text: string): string     // toLowerCase, trim, colapsa espacios
parseDeliveryDays(text: string): number // "Llega en 3 días" → 3
```

---

## Scheduler

### PriceTrackingJob
**Archivo:** `src/infrastructure/scheduler/PriceTrackingJob.ts`

Job que ejecuta `PriceRefresh` y `AlertEvaluation` en un intervalo fijo.

```typescript
class PriceTrackingJob {
  start(): void  // inicia el setInterval
  stop(): void   // limpia el timer (para graceful shutdown)
}
```

Internamente usa `setInterval`. El tick es:
```typescript
private async tick(): Promise<void> {
  await this.priceRefresh.refresh();
  await this.alertEvaluation.evaluate();
}
```

Si el tick lanza un error, lo captura y loguea (`console.error`) sin detener el job.

**Uso en server.ts:**
```typescript
scheduler.start();  // al arrancar el servidor

// Graceful shutdown en SIGTERM/SIGINT:
scheduler.stop();
server.close(() => process.exit(0));
```
