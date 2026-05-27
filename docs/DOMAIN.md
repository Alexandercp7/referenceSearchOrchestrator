# Capa de Dominio

La capa de dominio contiene toda la lógica de negocio. **No depende de Express, JWT, bcrypt, ni ninguna librería de infraestructura.** La única excepción es `decimal.js`, usada en `Money` para aritmética precisa de precios.

---

## Entidades

Las entidades tienen **identidad** (campo `id`). Dos entidades con el mismo id son la misma, aunque sus otros campos difieran.

### User
**Archivo:** `src/domain/entities/User.ts`

Representa una cuenta de usuario.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador único |
| `email` | `Email` | Email validado y normalizado |
| `passwordHash` | `PasswordHash` | Hash de la contraseña (tipo branded) |
| `createdAt` | `Date` | Fecha de creación |

Todos los campos son `readonly`. La entidad es inmutable una vez creada.

---

### Product
**Archivo:** `src/domain/entities/Product.ts`

Representa un producto de una tienda externa.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador único |
| `title` | `string` | Nombre del producto |
| `price` | `Money` | Precio con moneda |
| `store` | `string` | Nombre de la tienda (ej: `"amazon"`) |
| `url` | `string` | URL del producto |
| `inStock` | `boolean` | ¿Tiene stock? |
| `deliveryDays` | `number` | Días estimados de entrega (≥ 0) |
| `msi` | `number` | Meses sin intereses disponibles (≥ 0, default 0) |

**Validaciones en constructor:**
- `deliveryDays < 0` → lanza `InvalidProduct`
- `msi < 0` → lanza `InvalidProduct`

---

### WatchlistItem
**Archivo:** `src/domain/entities/WatchlistItem.ts`

Representa un producto que un usuario está monitoreando.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador único |
| `userId` | `string` | ID del usuario dueño |
| `productUrl` | `string` | URL del producto a monitorear |
| `store` | `string` | Tienda del producto |
| `addedAt` | `Date` | Cuándo fue agregado |

---

### Alert
**Archivo:** `src/domain/entities/Alert.ts`

Representa una alerta de precio configurada por un usuario.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador único |
| `userId` | `string` | ID del usuario dueño |
| `productUrl` | `string` | URL del producto monitoreado |
| `condition` | `AlertCondition` | Condición que dispara la alerta |
| `active` | `boolean` | Si la alerta está activa |
| `lastTriggeredAt` | `Date \| null` | Última vez que se disparó |

**Método `trigger(at: Date): Alert`** — devuelve una nueva instancia de Alert con `lastTriggeredAt` actualizado. No muta la original (inmutabilidad).

**Validación:** `productUrl` vacío → lanza `InvalidProductUrl`.

---

### PriceSnapshot
**Archivo:** `src/domain/entities/PriceSnapshot.ts`

Representa el precio de un producto en un momento específico del tiempo.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` (UUID) | Identificador único |
| `productUrl` | `string` | URL del producto |
| `store` | `string` | Tienda |
| `price` | `Money` | Precio capturado |
| `capturedAt` | `Date` | Timestamp de la captura |

Usado por el scheduler para construir el historial de precios.

---

## Value Objects

Los value objects son **inmutables** y se comparan por **valor** (no por referencia). Se auto-validan en el constructor y lanzan un error de dominio si reciben datos inválidos.

### Money
**Archivo:** `src/domain/valueObjects/Money.ts`

Representa una cantidad monetaria con moneda. Usa `decimal.js` internamente para evitar errores de punto flotante.

```typescript
new Money(99.99, 'MXN')   // OK
new Money(-1, 'MXN')      // → InvalidMoney: "amount cannot be negative"
new Money(100, 'MX')      // → InvalidMoney: "Currency must be a 3-letter ISO code"
```

**Métodos:**

| Método | Descripción |
|---|---|
| `add(other: Money): Money` | Suma, requiere misma moneda |
| `subtract(other: Money): Money` | Resta, requiere misma moneda |
| `equals(other: Money): boolean` | Comparación por valor |
| `isLessThan(other: Money): boolean` | Comparación menor que |
| `isGreaterThan(other: Money): boolean` | Comparación mayor que |
| `percentDropFrom(previous: Money): number` | % de caída respecto a un precio anterior |
| `toString(): string` | `"99.99 MXN"` |
| `toJSON()` | `{ amount: "99.99", currency: "MXN" }` |

Todos los métodos de comparación/operación lanzan `InvalidMoney` si las monedas no coinciden.

---

### Email
**Archivo:** `src/domain/valueObjects/Email.ts`

Email validado y normalizado a minúsculas.

```typescript
new Email('User@Example.COM')  // → value: "user@example.com"
new Email('no-arroba')         // → InvalidEmail
```

---

### PasswordHash
**Archivo:** `src/domain/valueObjects/PasswordHash.ts`

Tipo branded sobre `string`. Previene que un string arbitrario sea tratado como hash.

```typescript
// No se instancia directamente con `new`. Se usa la función de conversión:
import { asPasswordHash } from './PasswordHash';
const hash: PasswordHash = asPasswordHash(await bcrypt.hash(password, 10));
```

El branded type garantiza en tiempo de compilación que solo `JwtBcryptAuthGateway.hashPassword()` puede producir un `PasswordHash`.

---

### AlertCondition
**Archivo:** `src/domain/valueObjects/AlertCondition.ts`

Discriminated union que representa los tres tipos de condición de alerta.

```typescript
type AlertCondition =
  | { kind: 'PriceBelow';   threshold: Money }
  | { kind: 'PriceAtMin';   lookbackDays: number }
  | { kind: 'PriceDropPct'; percent: number; lookbackDays: number }
```

**Funciones constructoras (con validación):**

```typescript
// Dispara cuando el precio actual < umbral
priceBelow(new Money(500, 'MXN'))

// Dispara cuando el precio actual es el mínimo de los últimos N días
priceAtMin(30)   // lookbackDays debe ser entero >= 1

// Dispara cuando el precio cayó >= X% respecto al registro anterior en N días
priceDropPct(10, 30)  // percent en (0, 100], lookbackDays >= 1
```

---

### SearchWeights
**Archivo:** `src/domain/valueObjects/SearchWeights.ts`

Pesos de ranking para la búsqueda. Deben sumar exactamente 1.0 (tolerancia: 0.001).

```typescript
new SearchWeights(0.25, 0.25, 0.25, 0.25)  // balanceado
new SearchWeights(0.70, 0.10, 0.10, 0.10)  // enfocado en precio
new SearchWeights(0.5, 0.5, 0.5, 0.5)      // → InvalidWeights: "must sum to 1.0"
```

**Factory methods:**

```typescript
SearchWeights.balanced()      // (0.25, 0.25, 0.25, 0.25)
SearchWeights.priceFocused()  // (0.70, 0.10, 0.10, 0.10)
```

---

### DateRange
**Archivo:** `src/domain/valueObjects/DateRange.ts`

Rango de fechas validado (`from` debe ser ≤ `to`).

```typescript
DateRange.lastDays(30)  // desde hace 30 días hasta ahora
new DateRange(from, to) // → InvalidDateRange si from > to
```

---

### RankedProduct
**Archivo:** `src/domain/dtos/search/RankedProduct.ts`

Producto con score de ranking calculado por `WeightedRankStrategy`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID del producto |
| `title` | `string` | Nombre |
| `store` | `string` | Tienda |
| `url` | `string` | URL |
| `price` | `Money` | Precio |
| `score` | `number` | Score en [0, 1] (mayor = mejor) |

---

## Use Cases

Cada use case encapsula una sola operación de negocio. Se instancian con sus dependencias inyectadas (repositorios, gateways, servicios). **Nunca se llaman entre sí.**

### Autenticación

#### UserRegistration
**Archivo:** `src/domain/usecases/UserRegistration.ts`

```
register(request: { email, password }) → AuthResponse
```
1. Valida el email creando `new Email(request.email)`.
2. Verifica que el email no esté registrado (`UserAlreadyExists` si ya existe).
3. Hashea la contraseña con `PasswordGateway`.
4. Crea y persiste el `User`.
5. Genera par de tokens JWT y devuelve `AuthResponse`.

**Dependencias:** `UserRepository`, `PasswordGateway`, `TokenGateway`

---

#### UserLogin
**Archivo:** `src/domain/usecases/UserLogin.ts`

```
login(request: { email, password }) → AuthResponse
```
1. Busca el usuario por email.
2. Si no existe → `InvalidCredentials` (mismo error que contraseña incorrecta, para no revelar si el email existe).
3. Verifica la contraseña con `PasswordGateway`.
4. Si es inválida → `InvalidCredentials`.
5. Genera y devuelve par de tokens.

**Dependencias:** `UserRepository`, `PasswordGateway`, `TokenGateway`

---

#### TokenRefresh
**Archivo:** `src/domain/usecases/TokenRefresh.ts`

```
refresh(refreshToken: string) → AuthResponse
```
Verifica el refresh token y genera un nuevo par de tokens.

**Dependencias:** `TokenGateway`

---

### Búsqueda

#### ProductSearch
**Archivo:** `src/domain/usecases/ProductSearch.ts`

```
search(request: { query, weights }) → SearchResponse
```
1. Construye la clave de caché incluyendo query + los 4 pesos.
2. Si hay hit en caché, devuelve resultado con `fromCache: true`.
3. Si no: lanza `Promise.allSettled` sobre todos los stores (nunca falla si un store falla).
4. Si todos los stores devuelven vacío → `AllStoresFailed`.
5. Normaliza cada `RawProduct` a `Product` con el `Normalizer`.
6. Rankea los productos con `RankStrategy`.
7. Guarda en caché con TTL (default 300 segundos).
8. Devuelve `SearchResponse` con `fromCache: false`.

**Dependencias:** `SearchableStore[]`, `Normalizer`, `RankStrategy`, `SearchCache`

---

### Watchlist

#### WatchlistAddition
**Archivo:** `src/domain/usecases/WatchlistAddition.ts`

Agrega un producto a la watchlist del usuario y guarda un snapshot inicial de precio.

**Dependencias:** `WatchlistRepository`, `PriceHistoryRepository`, `Map<string, FetchableStore>`, `Normalizer`

---

#### WatchlistRemoval
**Archivo:** `src/domain/usecases/WatchlistRemoval.ts`

Elimina un item de la watchlist. Lanza `WatchlistItemNotFound` si no existe.

**Dependencias:** `WatchlistRepository`

---

#### WatchlistView
**Archivo:** `src/domain/usecases/WatchlistView.ts`

Lista los items de watchlist de un usuario con el precio más reciente disponible.

**Dependencias:** `WatchlistRepository`, `PriceHistoryRepository`

---

### Precios

#### PriceRefresh
**Archivo:** `src/domain/usecases/PriceRefresh.ts`

```
refresh() → void
```
Job de fondo. Itera todos los items de watchlist:
1. Busca el store correspondiente en el mapa `Map<storeName, FetchableStore>`.
2. Llama `store.fetchOne(url)` para obtener el precio actualizado.
3. Normaliza y guarda un nuevo `PriceSnapshot` con timestamp actual.

Usa `Promise.allSettled` — si un item falla, los demás continúan.

**Dependencias:** `WatchlistRepository`, `PriceHistoryRepository`, `Map<string, FetchableStore>`, `Normalizer`

---

#### PriceHistoryQuery
**Archivo:** `src/domain/usecases/PriceHistoryQuery.ts`

```
query(request: { userId, productUrl, from, to }) → PricePoint[]
```
Devuelve el historial de precios de un producto en un rango de fechas.

**Dependencias:** `PriceHistoryRepository`

---

### Alertas

#### AlertCreation
**Archivo:** `src/domain/usecases/AlertCreation.ts`

```
create(request: { userId, productUrl, condition }) → Alert
```
Crea una alerta activa con `lastTriggeredAt = null`.

**Dependencias:** `AlertRepository`

---

#### AlertRemoval
**Archivo:** `src/domain/usecases/AlertRemoval.ts`

Elimina una alerta. Lanza `AlertNotFound` si no existe.

**Dependencias:** `AlertRepository`

---

#### AlertListing
**Archivo:** `src/domain/usecases/AlertListing.ts`

Lista todas las alertas de un usuario.

**Dependencias:** `AlertRepository`

---

#### AlertEvaluation
**Archivo:** `src/domain/usecases/AlertEvaluation.ts`

```
evaluate() → void
```
Job de fondo. Para cada alerta activa:
1. Obtiene el último snapshot de precio del producto (`history.getLatest`).
2. Selecciona el evaluador correspondiente al tipo de condición (`Map<kind, evaluator>`).
3. Si el evaluador dice que la condición se cumple:
   - Busca el usuario.
   - Notifica vía `NotificationGateway`.
   - Actualiza la alerta con `alert.trigger(now)`.

**Dependencias:** `AlertRepository`, `PriceHistoryRepository`, `UserRepository`, `NotificationGateway`, `Map<AlertCondition['kind'], AlertConditionEvaluator>`

---

## Servicios de Dominio (evaluadores de condiciones)

Implementan `AlertConditionEvaluator`. Viven en `src/domain/services/` porque contienen lógica de negocio pura (no dependen de infra).

### PriceBelowEvaluator
**Archivo:** `src/domain/services/PriceBelowEvaluator.ts`

Dispara si `snapshot.price < condition.threshold`.

### PriceAtMinEvaluator
**Archivo:** `src/domain/services/PriceAtMinEvaluator.ts`

Dispara si `snapshot.price` es igual al mínimo histórico en el rango de `lookbackDays`.

### PriceDropPctEvaluator
**Archivo:** `src/domain/services/PriceDropPctEvaluator.ts`

Dispara si el precio cayó `>= condition.percent` % respecto al snapshot anterior en el rango de `lookbackDays`.
Requiere al menos 2 snapshots en el rango; si solo hay uno, devuelve `false`.

---

## Interfaces (puertos outbound)

Son contratos TypeScript que el dominio exige. La infraestructura los implementa.

### Repositorios

#### UserRepository
```typescript
findById(id: string): Promise<User | null>
findByEmail(email: Email): Promise<User | null>
save(user: User): Promise<void>
```

#### AlertRepository
```typescript
findById(id: string): Promise<Alert | null>
findActive(): Promise<Alert[]>
findByUser(userId: string): Promise<Alert[]>
save(alert: Alert): Promise<void>
remove(id: string): Promise<void>
```

#### WatchlistRepository
```typescript
findById(id: string): Promise<WatchlistItem | null>
findByUser(userId: string): Promise<WatchlistItem[]>
findAll(): Promise<WatchlistItem[]>
exists(userId: string, productUrl: string): Promise<boolean>
save(item: WatchlistItem): Promise<void>
remove(id: string): Promise<void>
```

#### PriceHistoryRepository
```typescript
saveSnapshot(snapshot: PriceSnapshot): Promise<void>
getLatest(productUrl: string): Promise<PriceSnapshot | null>
getHistory(productUrl: string, range: DateRange): Promise<PriceSnapshot[]>
getMin(productUrl: string, range: DateRange): Promise<Money | null>
```

### Gateways

#### TokenGateway
```typescript
createTokens(payload: TokenPayload): Promise<TokenPair>
verifyAccessToken(token: string): Promise<TokenPayload>
verifyRefreshToken(token: string): Promise<TokenPayload>
```
Donde `TokenPayload = { userId: string; email: string }` y `TokenPair = { accessToken: string; refreshToken: string }`.

#### PasswordGateway
```typescript
hashPassword(plain: string): Promise<string>
verifyPassword(plain: string, hash: PasswordHash): Promise<boolean>
```

#### AuthGateway
```typescript
type AuthGateway = PasswordGateway & TokenGateway
```
Tipo compuesto: implementar `AuthGateway` significa implementar ambos.

#### NotificationGateway
```typescript
notify(user: User, alert: Alert, snapshot: PriceSnapshot): Promise<void>
```

### Servicios

#### RankStrategy
```typescript
rank(products: Product[], weights: SearchWeights): RankedProduct[]
```

#### Normalizer
```typescript
normalize(raw: RawProduct): Product
```

#### SearchCache
```typescript
get(key: string): Promise<SearchResponse | null>
set(key: string, value: SearchResponse, ttlSeconds: number): Promise<void>
```

#### AlertConditionEvaluator
```typescript
readonly kind: AlertCondition['kind']
matches(condition: AlertCondition, snapshot: PriceSnapshot, history: PriceHistoryRepository): Promise<boolean>
```

### Stores

#### SearchableStore
```typescript
readonly name: string
search(query: string): Promise<RawProduct[]>
```

#### FetchableStore
```typescript
readonly name: string
fetchOne(url: string): Promise<RawProduct | null>
```

#### RawProduct
```typescript
interface RawProduct {
  id: string
  title: string
  price: string | number    // texto crudo: "MX$1,299.00" o número
  store: string
  url: string
  stockText?: string        // "En stock" | "Agotado" | undefined
  deliveryText?: string     // "Llega en 2 días" | undefined
  msiText?: string          // "12 MSI" | undefined
}
```
`RawProduct` es lo que devuelven los scrapers. El `Normalizer` lo convierte en `Product`.

---

## Excepciones de dominio

Todas extienden `DomainError`, que extiende `Error`. Cada una tiene un campo `code: string` que el `ErrorHandler` de infraestructura mapea a un HTTP status code.

### Jerarquía completa

```
DomainError (abstracta)
├── UserErrors
│   ├── InvalidEmail              → code: 'INVALID_EMAIL'
│   ├── InvalidPasswordHash       → code: 'INVALID_PASSWORD_HASH'
│   ├── UserAlreadyExists         → code: 'USER_ALREADY_EXISTS'
│   ├── UserNotFound              → code: 'USER_NOT_FOUND'
│   ├── InvalidCredentials        → code: 'INVALID_CREDENTIALS'
│   └── InvalidToken              → code: 'INVALID_TOKEN'
├── SearchErrors
│   ├── InvalidProductUrl         → code: 'INVALID_PRODUCT_URL'
│   ├── InvalidScore              → code: 'INVALID_SCORE'
│   ├── InvalidProduct            → code: 'INVALID_PRODUCT'
│   ├── AllStoresFailed           → code: 'ALL_STORES_FAILED'
│   ├── InvalidWeights            → code: 'INVALID_WEIGHTS'
│   └── ProductNotFound           → code: 'PRODUCT_NOT_FOUND'
├── WatchlistErrors
│   ├── ItemAlreadyTracked        → code: 'ITEM_ALREADY_TRACKED'
│   ├── WatchlistItemNotFound     → code: 'WATCHLIST_ITEM_NOT_FOUND'
│   └── UnknownStore              → code: 'UNKNOWN_STORE'
├── AlertErrors
│   ├── AlertNotFound             → code: 'ALERT_NOT_FOUND'
│   └── InvalidAlertCondition     → code: 'INVALID_ALERT_CONDITION'
├── MoneyErrors
│   └── InvalidMoney              → code: 'INVALID_MONEY'
└── DateRangeErrors
    └── InvalidDateRange          → code: 'INVALID_DATE_RANGE'
```

### Por qué `code` en lugar de usar `instanceof`

El `ErrorHandler` en infraestructura mapea `code` → HTTP status. Usar `instanceof` requeriría importar cada clase de error; usar `code` desacopla completamente la infraestructura del árbol de herencia del dominio.

```typescript
const STATUS_BY_CODE: Record<string, number> = {
  USER_ALREADY_EXISTS:    409,
  USER_NOT_FOUND:         404,
  INVALID_CREDENTIALS:    401,
  INVALID_TOKEN:          401,
  ALL_STORES_FAILED:      502,
  // ...etc
};
```
