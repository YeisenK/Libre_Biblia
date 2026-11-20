# Repositorio de borradores (no revisados)

Catálogo **separado** del oficial (`content/catalog.json`) con contenido editorial en borrador, pendiente de revisión por el autor del proyecto. No se publica en el catálogo oficial hasta que `status` pase a `reviewed`.

URL para añadirlo en la app (jsDelivr):

```
https://cdn.jsdelivr.net/gh/YeisenK/Libre_Biblia@main/content/drafts/catalog.json
```

## Contenido

| id | Tipo | Descripción |
|---|---|---|
| `daily.ciclo-tematico` | `daily` | Ciclo temático «Versículo del día»: 366 entradas (01-01 a 12-31, con 02-29). Contenido devocional, no Magisterio. |

Estructura: `catalog.json` + `packs/<id>.json.gz` (mismo formato 1 que `content/README.md`).

## Regenerar

Los paquetes se generan desde `tools/ingest/sources/daily/*.md`; no se editan a mano:

```bash
pnpm --filter @bc/ingest exec tsx src/cli.ts daily check   # cotejo con la Biblia SBLM y validación
pnpm --filter @bc/ingest exec tsx src/cli.ts daily pack    # escribe packs/ y catalog.json (determinista)
```

Cómo revisar y publicar: ver `tools/ingest/sources/daily/README.md`.
