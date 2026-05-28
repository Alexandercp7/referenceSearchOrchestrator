# Search Orchestrator — Reference Implementation

Implementación de referencia con Clean Architecture en TypeScript.

## Documentación

- [Arquitectura General](docs/ARCHITECTURE.md) — capas, flujo de requests, wiring, variables de entorno
- [Capa de Dominio](docs/DOMAIN.md) — entidades, value objects, use cases, interfaces, excepciones
- [Capa de Infraestructura](docs/INFRASTRUCTURE.md) — controllers, repositories, gateways, stores, scheduler
- [API Reference](docs/API.md) — todos los endpoints con ejemplos de request/response

## Estructura

```
src/
├── domain/                      ← Sin dependencias externas (excepto decimal.js)
│   ├── entities/                ← Estado + identidad
│   ├── valueObjects/            ← Inmutables, comparados por valor, auto-validados
│   ├── dtos/                    ← Inputs/outputs de use cases
│   ├── interfaces/              ← Puertos outbound
│   │   ├── repositories/        ← Persistencia (datos propios)
│   │   ├── gateways/            ← Acceso a sistemas externos (auth, notif, stores)
│   │   └── services/            ← Algoritmos infra-agnósticos
│   ├── usecases/                ← Orquestación de la lógica de negocio
│   └── exceptions/              ← Errores de dominio
│
├── infrastructure/              ← Depende de domain. Nunca al revés.
│   ├── controller/              ← HTTP handlers, un controller por recurso
│   ├── repositories/            ← Impls concretas de repos/stores/gateways/services
│   ├── http/                    ← Middleware (auth, error handler)
│   └── scheduler/               ← Jobs cron (PriceRefresh, AlertEvaluation)
│
├── app.ts                       ← Wiring + Express app
└── server.ts                    ← Entry point
```

## Comandos

```bash
npm install           # Instalar deps
npm run typecheck     # Verificar tipos
npm run dev           # Levantar server en modo watch
npm run start         # Levantar server
npm test              # Correr tests
```

## Regla de dependencias

`use-cases` puede importar todo dentro de `domain/`, pero **NUNCA** un use case importa a otro.
`infrastructure` puede importar de `domain`. **NUNCA** al revés.

Las interfaces outbound viven en `domain/interfaces/`. Sus implementaciones concretas viven en `infrastructure/repositories/` (sí, todas juntas como en el ejemplo de referencia).
