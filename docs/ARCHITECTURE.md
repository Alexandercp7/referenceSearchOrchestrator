# Arquitectura General — SearchOrchestrator

## ¿Qué es este proyecto?

SearchOrchestrator es una API REST que permite:
1. **Buscar productos** en múltiples tiendas en paralelo y rankearlos por relevancia.
2. **Monitorear precios** de productos específicos guardados en una watchlist.
3. **Disparar alertas** cuando el precio de un producto cumple una condición (baja de umbral, llega a mínimo histórico, cae un porcentaje).

---

## Estilo arquitectónico: Clean Architecture

El proyecto implementa [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). La idea central es que **el dominio no sabe nada de la infraestructura**. Todo fluye hacia adentro.

```
┌──────────────────────────────────────────────────────┐
│  INFRASTRUCTURE                                       │
│  (Express, JWT, bcrypt, InMemory, scrapers)           │
│                                                       │
│   ┌────────────────────────────────────────────┐     │
│   │  DOMAIN                                    │     │
│   │  (entidades, value objects, use cases)     │     │
│   │                                            │     │
│   │   Interfaces (puertos outbound)            │     │
│   │   ← implementadas por Infrastructure →     │     │
│   └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

**Regla de dependencias (la única que importa):**
- `domain/` → no importa nada de `infrastructure/`
- `infrastructure/` → puede importar de `domain/`
- Un use case → nunca importa a otro use case

---

## Estructura de carpetas

```
src/
├── domain/                  ← Lógica de negocio pura
│   ├── entities/            ← Objetos con identidad (id único)
│   ├── valueObjects/        ← Objetos inmutables comparados por valor
│   ├── dtos/                ← Contratos de entrada/salida de use cases
│   ├── interfaces/          ← Puertos outbound (contratos que infra implementa)
│   │   ├── repositories/    ← Persistencia de datos propios
│   │   ├── gateways/        ← Acceso a sistemas externos (auth, notificaciones)
│   │   ├── stores/          ← Puertos de tiendas (búsqueda y consulta de productos)
│   │   └── services/        ← Algoritmos sin estado infra-agnósticos
│   ├── usecases/            ← Orquestación: un use case = una operación de negocio
│   ├── services/            ← Servicios de dominio (evaluadores de condiciones)
│   └── exceptions/          ← Errores de dominio con código tipado
│
├── infrastructure/          ← Implementaciones concretas
│   ├── controller/          ← HTTP handlers (uno por recurso)
│   ├── repositories/        ← Implementaciones in-memory + gateways + services
│   ├── stores/              ← Scrapers reales (Amazon, MercadoLibre)
│   ├── http/                ← Middleware (auth, error handler)
│   └── scheduler/           ← Job de fondo (precio + alertas)
│
├── app.ts                   ← Contenedor de dependencias (wiring)
└── server.ts                ← Entry point (env vars, listen, shutdown)
```

---

## Flujo de una request típica

Tomemos `POST /search` como ejemplo:

```
HTTP Request
     │
     ▼
SearchController           ← parsea body, construye SearchWeights
     │
     ▼
ProductSearch (use case)   ← verifica caché → busca en stores → normaliza → rankea
     │
     ├── SearchCache        ← ¿hay resultado cacheado? devuelve con fromCache: true
     │
     ├── StoreProductSearch[]  ← Promise.allSettled([amazon.search(), mercadolibre.search()])
     │
     ├── Normalizer         ← RawProduct → Product (parsea texto, construye Money)
     │
     └── RankStrategy       ← Product[] + pesos → RankedProduct[] ordenados por score
     │
     ▼
SearchResponse             ← { query, results, fromCache }
     │
     ▼
HTTP 200 JSON
```

---

## Flujo del scheduler (background)

Cada N milisegundos (default: 60 segundos), `PriceTrackingJob` ejecuta:

```
tick()
  │
  ├── PriceRefresh.refresh()
  │     ├── watchlist.findAll()           ← todos los items trackeados
  │     └── por cada item:
  │           ├── store.fetchOne(url)     ← fetch del producto por URL
  │           ├── normalizer.normalize()  ← RawProduct → Product
  │           └── history.saveSnapshot() ← guarda PriceSnapshot con timestamp
  │
  └── AlertEvaluation.evaluate()
        ├── alerts.findActive()           ← alertas activas
        └── por cada alerta:
              ├── history.getLatest(url)  ← último precio registrado
              ├── evaluator.matches()     ← ¿la condición se cumple?
              ├── users.findById()        ← busca el usuario dueño
              ├── notifier.notify()       ← notifica (console por ahora)
              └── alerts.save(alert.trigger(now)) ← actualiza lastTriggeredAt
```

---

## Wiring (app.ts)

`app.ts` es el único lugar donde se instancian dependencias y se conectan entre sí. Ningún otro archivo hace `new InMemoryX()` o `new JwtBcrypt...()`.

El orden es siempre:
1. Repositorios / stores / gateways (implementaciones concretas)
2. Use cases (inyectando los anteriores)
3. Controllers (inyectando use cases)
4. Express app (rutas + middleware)
5. Scheduler (inyectando use cases de background)

```typescript
// Ejemplo de wiring en app.ts
const usersRepo = new InMemoryUserRepository();
const auth = new JwtBcryptAuthGateway({ secret, accessTtl: '15m', refreshTtl: '7d' });

const registration = new UserRegistration(usersRepo, auth, auth);  // inyección
const authController = new AuthController(registration, ...);       // inyección
app.use('/auth', authController.router);
```

---

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `JWT_SECRET` | `dev-secret-change-me` | Clave para firmar JWTs |
| `SCHEDULER_INTERVAL_MS` | `60000` | Intervalo del job de fondo (ms) |

---

## Comandos

```bash
npm install           # Instalar dependencias
npm run dev           # Servidor con hot-reload (tsx watch)
npm run start         # Servidor producción
npm run typecheck     # Verificar tipos TypeScript sin compilar
npm test              # Correr tests con Vitest
```
