# Search Orchestrator — Reference Implementation

Implementación de referencia con Clean Architecture en TypeScript.



## Estructura

```
Arch.md
package.json
README.md
STEPS.md
tsconfig.json
vitest.config.ts
db/
	schema.sql
docs/
	API.md
	ARCHITECTURE.md
	DOMAIN.md
	INFRASTRUCTURE.md
	TEST_CONTRACTS.md
	USECASES.md
public/
	index.html
src/
	app.ts
	config.ts
	server.ts
	domain/
		dtos/
			alerts/
			auth/
			priceHistory/
			search/
			watchlist/
		entities/
			Alert.ts
			PriceSnapshot.ts
			Product.ts
			User.ts
			WatchlistItem.ts
		exceptions/
			AlertErrors.ts
			DateRangeErrors.ts
			DomainError.ts
			MoneyErrors.ts
			SearchErrors.ts
			UserErrors.ts
			WatchlistErrors.ts
		interfaces/
			gateways/
			repositories/
			services/
		services/
			PriceAtMinEvaluator.ts
			PriceBelowEvaluator.ts
			PriceDropPctEvaluator.ts
		usecases/
			AlertCreation.ts
			AlertEvaluation.ts
			AlertListing.ts
			AlertRemoval.ts
			PriceHistoryQuery.ts
			PriceRefresh.ts
			ProductSearch.ts
			TokenRefresh.ts
			UpdateUserPreferences.ts
			UserLogin.ts
			UserRegistration.ts
			WatchlistAddition.ts
			WatchlistRemoval.ts
			WatchlistView.ts
		valueObjects/
			AlertCondition.ts
			DateRange.ts
			DisplayName.ts
			Email.ts
			Money.ts
			PasswordHash.ts
			RankedProduct.ts
			SearchWeights.ts
	infrastructure/
		cache/
			InMemorySearchCache.ts
			RedisSearchCache.ts
		container/
			Container.ts
		controller/
			AlertController.ts
			AuthController.ts
			PriceHistoryController.ts
			SearchController.ts
			WatchlistController.ts
		http/
			AuthMiddleware.ts
			ErrorHandler.ts
			ExpressTypes.ts
		identity/
			UuidGenerator.ts
		normalizer/
			RegexNormalizer.ts
		notifications/
			SmtpNotificationGateway.ts
		persistence/
			mappers/
			mysql/
		ranking/
			WeightedRankStrategy.ts
		scheduler/
			PriceTrackingJob.ts
		security/
			BcryptPasswordGateway.ts
			JwtTokenGateway.ts
		stores/
			AmazonMxStore.ts
			AmazonScraperStore.ts
			MercadoLibreScraperStore.ts
			...
	presentation/
		server.ts
		middleware/
			...
		routes/
			...
tests/
	domain/
		entities/
			...
		services/
		usecases/
		valueObjects/
```

## Comandos

```bash
npm install           # Instalar deps
npm run typecheck     # Verificar tipos
npm run dev           # Levantar server en modo watch
npm run start         # Levantar server
npm test              # Correr tests
```

## Cómo correr (local)

- Requisitos: `Node.js` 16+ y (opcional) MySQL si quieres persistencia.
- Copia el archivo de ejemplo de variables de entorno y ajústalo:

```bash
cp .env.example .env
# Edita `.env` (por ejemplo `JWT_SECRET`, puertos, credenciales DB)
```

- Instala dependencias y levanta la aplicación en modo desarrollo:

```bash
npm install
npm run dev   # modo watch (usa .env)
# o para ejecutar sin watch:
npm run start
```

- Si usas MySQL, crea la base de datos y aplica el esquema:

```bash
# Ajusta <user> y <database> según tu .env
mysql -u <user> -p <database> < db/schema.sql
```

- Correr tests:

```bash
npm test
```

## Regla de dependencias

`use-cases` puede importar todo dentro de `domain/`, pero **NUNCA** un use case importa a otro.
`infrastructure` puede importar de `domain`. **NUNCA** al revés.

Las interfaces outbound viven en `domain/interfaces/`. Sus implementaciones concretas viven en `infrastructure/repositories/` (sí, todas juntas como en el ejemplo de referencia).


## Documentación

- [Arquitectura General](docs/ARCHITECTURE.md) — capas, flujo de requests, wiring, variables de entorno
- [Capa de Dominio](docs/DOMAIN.md) — entidades, value objects, use cases, interfaces, excepciones
- [Capa de Infraestructura](docs/INFRASTRUCTURE.md) — controllers, repositories, gateways, stores, scheduler
- [API Reference](docs/API.md) — todos los endpoints con ejemplos de request/response