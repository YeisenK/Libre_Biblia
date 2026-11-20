# Repositorio de contenido

Carpeta publicada (jsDelivr: `https://cdn.jsdelivr.net/gh/YeisenK/Libre_Biblia@main/content/catalog.json`) de la que la app descarga paquetes opcionales. Cualquiera puede publicar su propio repositorio con este formato y añadir su URL de `catalog.json` en la app.

## Estructura

```
catalog.json            índice de paquetes
packs/<id>.json.gz      un paquete por archivo (JSON compacto comprimido con gzip)
```

## catalog.json (formato 1)

```json
{
  "format": 1,
  "name": "Nombre del repositorio",
  "homepage": "https://...",
  "updatedAt": "2026-11-20T00:00:00.000Z",
  "packs": [
    {
      "id": "bible.VULG", "kind": "bible", "version": "2026.11.20",
      "title": "...", "description": "...", "language": "la",
      "url": "packs/bible.VULG.json.gz",
      "bytes": 1455220, "sha256": "<sha256 del .json.gz>",
      "authority": "scripture", "collection": "Biblias",
      "source": { "name": "...", "license": "texto literal de la licencia",
        "licenseUrl": "...", "provenanceUrl": "...", "downloadUrl": "...",
        "originalSha256": "...", "retrievedAt": "ISO-8601" }
    }
  ]
}
```

- `id` es único en el catálogo (`bible.<CODE>`, `doc.<slug>`). `url` es relativa al catálogo o absoluta.
- `bytes` y `sha256` son del archivo `.json.gz`; la app verifica el sha256 antes de instalar.
- `kind`: `bible` o `document`. `authority`: `scripture`, `magisterium`, `patristic`, `theological_opinion`, `academic_hypothesis`, `literary`, `personal`.
- Todo paquete debe declarar `source.license` (literal) y `source.provenanceUrl`. Publica solo contenido que tengas derecho a distribuir.

## Paquete bíblico (`kind: "bible"`)

```json
{ "format": 1, "kind": "bible", "id": "bible.VULG", "version": "2026.11.20",
  "meta": { "code": "VULG", "name": "...", "language": "la", "edition": null,
            "versification": "vulgate", "completeness": "complete", "source": { } },
  "books": { "Gen": { "1": [[1, "texto del versículo"], [2, "..."]] } } }
```

Los libros usan identificadores OSIS (`Gen`, `Ps`, `1Macc`, `Matt`...), capítulos como claves de texto y versículos como pares `[número, texto]`.

## Paquete de documento (`kind: "document"`)

`meta` (slug, title, genre, authority, language, source...) y `sections: [{ path, depth, title?, text }]` con texto plano. Los tipos exactos están en `packages/shared/src/packs.ts`.

## Generar los paquetes

Los paquetes bíblicos se generan con `pnpm --filter @bc/ingest ingest`. La salida es determinista (claves ordenadas, gzip nivel 9 con mtime 0), así que el mismo origen produce el mismo sha256. `src/catalog.ts` fusiona entradas en `catalog.json` sin borrar las de otros ids.
