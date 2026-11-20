# Arquitectura

## Objetivo
Plataforma católica de lectura y estudio bíblico para **navegador y celular** desde una sola base de código, con fuentes trazables y separación estricta entre tipos de autoridad del contenido (Escritura, Magisterio, Padres, opinión teológica, hipótesis académica, reflexión personal).

## Vista general
```
┌───────────────┐   HTTPS/JSON   ┌──────────────────┐   Prisma/SQL   ┌────────────────────┐
│ apps/web      │ ─────────────▶ │ apps/api         │ ─────────────▶ │ PostgreSQL 16      │
│ Next.js (PWA) │                │ NestJS (REST)    │                │ + pg_trgm + pgvector│
│ export estático│ ◀───────────── │ /api/v1, Swagger │ ──▶ Redis (caché/colas, fases 5+)  │
└──────┬────────┘                └──────────────────┘ ──▶ MinIO/S3 (documentos, fase 5) │
       │ mismo bundle                                                      └────────────────────┘
┌──────▼────────┐        ┌──────────────────────────────┐
│ apps/mobile   │        │ tools/ingest                 │
│ Capacitor     │        │ descarga → convierte → valida│
│ (Android APK) │        │ → carga traducciones en BD   │
└───────────────┘        └──────────────────────────────┘
```

## Decisiones clave
| # | Decisión | Motivo |
|---|---|---|
| ADR-001 | Monorepo pnpm + Turborepo | Tipos compartidos (`@bc/shared`) entre API, web e ingesta; un solo `pnpm test`. |
| ADR-002 | Web y móvil con un solo frontend: Next.js `output: 'export'` + PWA + Capacitor | El usuario quiere celular y navegador. Exportación estática ⇒ funciona offline y dentro de Capacitor; sin duplicar UI en Flutter/React Native. Consecuencia: rutas con query params, sin SSR. |
| ADR-003 | NestJS modular | Módulos por dominio (Auth, Bible, Search…) que crecen hasta las 9 fases sin reescribir. |
| ADR-004 | PostgreSQL FTS + pg_trgm ahora; pgvector reservado | La búsqueda léxica cubre la fase 3; la semántica (fase 8) reutiliza el mismo Postgres. |
| ADR-005 | `tsv` mantenido por trigger | Una columna generada no admite `ts_config::regconfig` (cast no inmutable); cada versión declara su configuración (`spanish`, `english`, `simple` para latín). |
| ADR-006 | Refresh token opaco con rotación por familia | Detecta robo por reutilización. Web: cookie httpOnly; nativo: cuerpo + almacenamiento seguro. |
| ADR-007 | Toda fuente de terceros referencia `Source` | Licencia literal, URL de procedencia, checksum y fecha de obtención; requisito de propiedad intelectual. |
| ADR-008 | Versificación explícita por versión + `VerseMapping` | Las Biblias católicas antiguas siguen la Vulgata (Salmos LXX, Ester 16 caps., Daniel 14). Clave canónica `OSIS.cap.vers`. |

## Paquetes
- `packages/shared` — canon de 73 libros, parser/formateador de referencias (`Jn 3,16-18`, `Mt 5,1-7,29`, alias en es/en/la), DTOs de la API.
- `packages/db` — esquema Prisma, migraciones SQL, seed del canon.
- `apps/api` — NestJS. Módulos actuales: auth, users, bible, search, bookmarks, reading, health.
- `apps/web` — Next.js PWA: lector, comparación, búsqueda, marcadores, ajustes, descarga offline (IndexedDB).
- `apps/mobile` — proyecto Capacitor Android que empaqueta `apps/web/out`.
- `tools/ingest` — pipeline reproducible de traducciones.

## Offline
1. El service worker precachea el shell (HTML/JS/CSS/fuentes).
2. El usuario descarga una versión completa (`/bible/versions/:code/offline`) a IndexedDB.
3. El lector consulta IndexedDB primero si la versión está descargada, y como respaldo si falla la red.
4. Datos personales (marcadores, posición) requieren conexión en la fase 3; la sincronización offline-first es la fase 6.

## Seguridad
argon2id, JWT de acceso de 15 min, refresh rotatorio, Helmet, rate limit (más estricto en `/auth`), CORS por lista, validación con whitelist, SQL siempre parametrizado (`Prisma.sql`), snippets de búsqueda escapados en servidor y saneados en cliente, borrado y exportación de cuenta.

## Futuras fases
Ver `ROADMAP.md` y `DATA_MODEL.md`. Los módulos no implementados no tienen UI: no hay botones sin función.
