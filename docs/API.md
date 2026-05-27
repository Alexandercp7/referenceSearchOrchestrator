# API Reference

Base URL: `http://localhost:3000`

Todas las respuestas son JSON. Los errores siempre tienen el formato:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción legible del error"
  }
}
```

---

## Autenticación

Las rutas protegidas requieren el header:
```
Authorization: Bearer <accessToken>
```

El access token expira en **15 minutos**. Usar `/auth/refresh` para renovarlo.

---

## Endpoints

### `GET /health`

Verifica que el servidor esté corriendo. No requiere autenticación.

**Respuesta `200`:**
```json
{ "ok": true }
```

---

### `POST /auth/register`

Registra un nuevo usuario.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "mi-contraseña-segura"
}
```

**Respuesta `201`:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_EMAIL` | 400 | Email con formato inválido |
| `USER_ALREADY_EXISTS` | 409 | El email ya está registrado |

---

### `POST /auth/login`

Inicia sesión con un usuario existente.

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "mi-contraseña-segura"
}
```

**Respuesta `200`:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos (mismo error en ambos casos para no filtrar info) |

---

### `POST /auth/refresh`

Renueva el access token usando el refresh token.

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**Respuesta `200`:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_TOKEN` | 401 | Refresh token inválido o expirado |

---

### `POST /search`

Busca productos en todas las tiendas disponibles y los rankea.

No requiere autenticación.

**Body:**
```json
{
  "query": "iphone 15",
  "weights": {
    "price":    0.40,
    "stock":    0.20,
    "delivery": 0.20,
    "msi":      0.20
  }
}
```

El campo `weights` es **opcional**. Si no se envía, se usan pesos iguales `0.25` para cada dimensión.

Los pesos deben cumplir:
- Cada uno en `[0, 1]`.
- Suma total = `1.0` (tolerancia ±0.001).

**Respuesta `200`:**
```json
{
  "query": "iphone 15",
  "fromCache": false,
  "results": [
    {
      "id": "abc123",
      "title": "iPhone 15 128GB Negro",
      "store": "amazon",
      "url": "https://amazon.com.mx/...",
      "price": {
        "amount": "17999.00",
        "currency": "MXN"
      },
      "score": 0.87
    },
    {
      "id": "def456",
      "title": "Apple iPhone 15 128GB",
      "store": "mercadolibre",
      "url": "https://mercadolibre.com.mx/...",
      "price": {
        "amount": "18500.00",
        "currency": "MXN"
      },
      "score": 0.74
    }
  ]
}
```

- `fromCache: true` si el resultado viene del cache.
- `results` está ordenado por `score` descendente (mejor primero).
- `score` es un número en `[0, 1]`.

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_WEIGHTS` | 400 | Pesos fuera de rango o no suman 1.0 |
| `ALL_STORES_FAILED` | 502 | Todas las tiendas fallaron o devolvieron vacío |

---

### `POST /watchlist` 🔒

Agrega un producto a la watchlist del usuario autenticado.

**Body:**
```json
{
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "store": "amazon"
}
```

**Respuesta `201`:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "store": "amazon",
  "addedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `ITEM_ALREADY_TRACKED` | 409 | El producto ya está en la watchlist |
| `UNKNOWN_STORE` | 400 | La tienda indicada no está soportada |

---

### `DELETE /watchlist/:id` 🔒

Elimina un item de la watchlist.

**Parámetros de URL:**
- `id` — ID del item de watchlist.

**Respuesta `204`:** Sin body.

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `WATCHLIST_ITEM_NOT_FOUND` | 404 | El item no existe |

---

### `GET /watchlist` 🔒

Lista todos los items de watchlist del usuario autenticado con el precio más reciente disponible.

**Respuesta `200`:**
```json
[
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
    "store": "amazon",
    "addedAt": "2024-01-15T10:30:00.000Z",
    "latestPrice": {
      "amount": "17999.00",
      "currency": "MXN"
    },
    "capturedAt": "2024-01-15T11:00:00.000Z"
  }
]
```

`latestPrice` y `capturedAt` son `null` si aún no hay snapshots de precio.

---

### `POST /alerts` 🔒

Crea una alerta de precio para un producto.

**Body base:**
```json
{
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "condition": { ... }
}
```

#### Tipo 1: PriceBelow
Dispara cuando el precio cae por debajo de un umbral.

```json
{
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "condition": {
    "kind": "PriceBelow",
    "amount": "15000",
    "currency": "MXN"
  }
}
```

#### Tipo 2: PriceAtMin
Dispara cuando el precio llega al mínimo histórico de los últimos N días.

```json
{
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "condition": {
    "kind": "PriceAtMin",
    "lookbackDays": 30
  }
}
```

#### Tipo 3: PriceDropPct
Dispara cuando el precio cae un porcentaje respecto al registro anterior en los últimos N días.

```json
{
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "condition": {
    "kind": "PriceDropPct",
    "percent": 10,
    "lookbackDays": 30
  }
}
```

**Respuesta `201`:**
```json
{
  "id": "alert-uuid",
  "userId": "user-uuid",
  "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
  "condition": {
    "kind": "PriceBelow",
    "threshold": { "amount": "15000", "currency": "MXN" }
  },
  "active": true,
  "lastTriggeredAt": null
}
```

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_ALERT_CONDITION` | 400 | `kind` desconocido, `percent` fuera de (0,100], `lookbackDays` < 1 |
| `INVALID_MONEY` | 400 | Monto negativo o moneda inválida |

---

### `DELETE /alerts/:id` 🔒

Elimina una alerta.

**Parámetros de URL:**
- `id` — ID de la alerta.

**Respuesta `204`:** Sin body.

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `ALERT_NOT_FOUND` | 404 | La alerta no existe |

---

### `GET /alerts` 🔒

Lista todas las alertas del usuario autenticado.

**Respuesta `200`:**
```json
[
  {
    "id": "alert-uuid",
    "productUrl": "https://amazon.com.mx/dp/B0CHX1W1XY",
    "condition": {
      "kind": "PriceDropPct",
      "percent": 10,
      "lookbackDays": 30
    },
    "active": true,
    "lastTriggeredAt": null
  }
]
```

---

### `GET /price-history` 🔒

Consulta el historial de precios de un producto en un rango de fechas.

**Query parameters:**
| Param | Tipo | Requerido | Descripción |
|---|---|---|---|
| `productUrl` | string | Sí | URL del producto |
| `from` | string (ISO 8601) | Sí | Inicio del rango |
| `to` | string (ISO 8601) | Sí | Fin del rango |

**Ejemplo:**
```
GET /price-history?productUrl=https://amazon.com.mx/dp/B0CHX1W1XY&from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z
```

**Respuesta `200`:**
```json
[
  {
    "price": { "amount": "17999.00", "currency": "MXN" },
    "capturedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "price": { "amount": "17500.00", "currency": "MXN" },
    "capturedAt": "2024-01-16T10:00:00.000Z"
  }
]
```

Los puntos están ordenados por `capturedAt` ascendente.

**Errores:**
| Code | Status | Cuándo |
|---|---|---|
| `INVALID_DATE_RANGE` | 400 | `from` > `to` o fechas inválidas |

---

## Notas de autenticación

El flujo típico es:

```
1. POST /auth/register → guarda accessToken y refreshToken
2. Usar accessToken en header: Authorization: Bearer <token>
3. Cuando el accessToken expire (15min):
   POST /auth/refresh con el refreshToken → nuevo par de tokens
4. El refreshToken dura 7 días
```

Si tanto el access como el refresh token expiran, el usuario debe hacer login nuevamente.
