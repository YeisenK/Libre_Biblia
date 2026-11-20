# Arquitectura

## Objetivo
Plataforma católica libre de lectura y estudio bíblico, con una sección de cultura hispánica. Funciona **en navegador y en celular** desde una sola base de código, **sin servidor y sin cuentas**: cada dispositivo es dueño de sus datos y descarga solo el contenido que quiere, desde repositorios públicos.

## Vista general
```
                Repositorios públicos (estáticos, CORS)
        ┌────────────────────────────────────────────────────┐
        │ content/catalog.json + packs/*.json.gz             │
        │  oficial: github.com/YeisenK/Libre_Biblia (jsDelivr)│
        │  terceros: cualquier URL con el mismo formato       │
        └──────────────▲─────────────────────────────────────┘
                       │ descarga opcional (sha256 verificado)
┌──────────────────────┴────────────────┐      ┌────────────────────────────┐
│ apps/web — Next.js export estático     │      │ tools/ingest (desarrollo)  │
│  PWA (service worker, instalable)      │      │ fuentes de dominio público │
│  IndexedDB (Dexie): paquetes, índices  │      │ → convierte → valida       │
│  de búsqueda, marcadores, historial,   │      │ → paquetes deterministas   │
│  ajustes, copias de seguridad          │      │ → content/catalog.json     │
└──────────────────────┬────────────────┘      └────────────────────────────┘
                       │ mismo bundle
              ┌────────▼────────┐
              │ apps/mobile     │
              │ Capacitor (APK) │
              └─────────────────┘
```

## Decisiones (ADR)
| # | Decisión | Motivo |
|---|---|---|
| ADR-001 | Monorepo pnpm + Turborepo | `@bc/shared` (canon, referencias, formato de paquetes) compartido por la app y la ingesta. |
| ADR-002 | Un solo frontend: Next.js `output: 'export'` + PWA + Capacitor | Celular y navegador con el mismo código; funciona offline y dentro de Capacitor. Rutas con query params. |
| ADR-009 | **Sin servidor ni cuentas** (sustituye a ADR-003/004/006 de la primera versión con NestJS+Postgres, que queda en el historial de git) | Privacidad total, coste cero de infraestructura, uso offline real. Cada sesión es del dispositivo. |
| ADR-010 | Contenido en **paquetes** descargables desde catálogos públicos | La app no trae textos de terceros embebidos; el usuario elige qué descargar. Cualquiera puede publicar un repositorio (como los repositorios de F-Droid). |
| ADR-011 | Paquetes deterministas `.json.gz` con sha256 en el catálogo | Integridad verificada en cliente con `crypto.subtle`; ingesta reproducible. |
| ADR-007 | Todo paquete declara `source` (licencia literal, procedencia, fecha, checksum original) | Requisito de propiedad intelectual; visible en «Fuentes y licencias». |
| ADR-008 | Versificación explícita por versión | Las Biblias católicas antiguas siguen la Vulgata (Salmos LXX, Ester 16, Daniel 14). |
| ADR-012 | Búsqueda local con MiniSearch en Web Worker, índice serializado en IndexedDB | Sin servidor; búsqueda aproximada y por prefijo; frase exacta por filtrado. |
| ADR-013 | Datos personales solo locales + copia de seguridad en archivo | No hay sincronización en la nube; exportar/importar JSON para cambiar de dispositivo. |

## Paquetes del monorepo
- `packages/shared` — canon de 73 libros, parser/formateador de referencias, tipos y validación de paquetes/catálogos.
- `apps/web` — la aplicación (PWA).
- `apps/mobile` — envoltorio Capacitor Android de `apps/web/out`.
- `tools/ingest` — genera los paquetes del repositorio oficial (`content/`).
- `content/` — repositorio oficial de contenido, servido desde GitHub vía jsDelivr.

## Almacenamiento local
Ver `DATA_MODEL.md`. La app pide almacenamiento persistente (`navigator.storage.persist()`) al instalar el primer paquete.

## Seguridad y privacidad
- No hay datos de usuario fuera del dispositivo; no hay telemetría.
- Los paquetes se validan (sha256 + estructura) antes de guardarse; su texto se muestra siempre como texto plano (nunca HTML).
- Los resaltados de búsqueda se generan escapando primero el texto.
- Los repositorios de terceros se marcan como tales y muestran su licencia declarada.

## Futuro (IA, fase 8)
Sin servidor propio: el usuario configura su proveedor y clave en el dispositivo (o un modelo local). RAG sobre los paquetes instalados con índice local.
