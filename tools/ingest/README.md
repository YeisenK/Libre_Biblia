# @bc/ingest

Ingesta de textos bíblicos de dominio público: descarga, conversión a un formato canónico, validación y empaquetado como paquetes `.json.gz` para el repositorio de contenido (`content/`). No hay base de datos ni servidor.

## Uso

Desde la raíz del monorepo:

```bash
pnpm --filter @bc/ingest ingest                 # descarga + convert + validate + pack
pnpm --filter @bc/ingest ingest --only VULG,DRA # solo algunas fuentes
pnpm --filter @bc/ingest run download | convert | validate | pack   # (usar "run" en pack: pnpm tiene un comando propio)
pnpm --filter @bc/ingest download --force       # repetir la descarga
pnpm --filter @bc/ingest test                   # vitest (parser USFM, limpiador ThML, LZSS)
```

Requiere el binario `unzip`.

Flujo y directorios (`raw/` y `out/` están en `.gitignore`):

1. `download` guarda cada fuente en `raw/<CODE>/` con `manifest.json` (URL, sha256, bytes, fecha) y extrae los zip a `raw/<CODE>/extracted/`. Los archivos descargados son datos no confiables: solo se leen como texto/bytes, nunca se ejecutan.
2. `convert` produce `out/<CODE>.json` con `{ code, books: { [osis]: { [cap]: [[verso, texto], ...] } } }` y `out/<CODE>.convert.json` (avisos y libros ignorados).
3. `validate` produce `out/<CODE>.report.json`. Errores (bloquean la carga): versículos vacíos o duplicados, libros fuera de CANON, libros ausentes en fuentes `complete`. Avisos: capítulos distintos de `vulgateChapters`, huecos de numeración, libros ausentes en fuentes parciales.
4. `pack` escribe `content/packs/bible.<CODE>.json.gz` (`BiblePack` de `@bc/shared`; versión = fecha `YYYY.MM.DD` de obtención; JSON compacto con libros en orden canónico, gzip nivel 9, mtime 0: el sha256 es reproducible) y fusiona sus entradas en `content/catalog.json` sin tocar las de otros ids (`src/catalog.ts`: `writePack`, `upsertCatalogEntries`, reutilizables para otros paquetes, p. ej. documentos culturales). Ver `content/README.md`.

Nunca se inventa ni se rellena texto: todo versículo sale del archivo fuente.

## Fuentes y licencias (`sources.json`)

| Código | Versión | Origen | Licencia declarada | tsConfig |
|---|---|---|---|---|
| VULG | Vulgata Clementina (la), 1598 | eBible.org `latVUC_usfm.zip` (`ebible:latVUC`) | "Public Domain" (copr.htm de eBible) | simple |
| DRA | Douay-Rheims 1899 American Edition (en) | eBible.org `engDRA_usfm.zip` (`ebible:engDRA`) | "Public Domain" | english |
| SCIO | Scío de San Miguel, NT, 2.ª ed. 1797 (es) | CrossWire `SpaScioNT.zip` + `spasciont.conf` (`sword:SpaScioNT`) | `DistributionLicense=Public Domain` | spanish |

Nota: DRA es la edición americana de 1899, NO la revisión de Challoner de 1752 (campo `edition`). SCIO es solo NT, por eso `completeness = partial`.

## Decisiones de conversión y versificación

- Se respeta la versificación de la fuente (Vulgata) y `versification = "vulgate"` en las tres versiones. Los Salmos usan la numeración Vulgata (Sal 22 = "El Señor es mi pastor").
- USFM: se mapean los 73 códigos USFM a OSIS de CANON (`src/osis-map.ts`). Ambos zip de eBible traen los 73 libros ya con la numeración Vulgata: Ester con 16 capítulos (adiciones griegas integradas en los capítulos 10-16), Daniel con 14 (Susana = 13, Bel = 14) y Baruc con 6 (Carta de Jeremías = cap. 6). Por eso no hay libros separados ESG/DAG/LJE que fusionar. Si apareciesen, se omiten y se registran en `*.convert.json` en vez de fusionarlos por conjetura. También se ignoran los libros fuera del canon de 73 (1-2 Esdras apócrifos, Oración de Manasés, etc.); en estas fuentes no vienen.
- USFM se limpia de notas (`\f`, `\x`), etiquetas de formato y atributos (`\w palabra|strong=..\w*`), y se descartan títulos (`\s`, `\ms`, `\d`, `\r`, `\mt`...). Espacios normalizados y Unicode NFC. El texto de la fuente se conserva tal cual: p. ej. la Vulgata de eBible incluye corchetes `[ ]` editoriales en algunos versículos.
- Rangos de versículos (`\v 1-2`) se guardan en el primer número y generan aviso (no ocurren en estas fuentes).
- SWORD zText (Scío): lector propio en Node (`src/sword.ts`). La compresión real es LZSS (no zlib), con bloques por libro (`BlockType=BOOK`); se descomprime con el LZSS de SWORD (anillo de 4096 con espacios, flags LSB, coincidencia = 12 bits de posición + 4 de longitud). La versificación del módulo es KJV, que solo se usa como índice para localizar libro/capítulo/versículo (`src/kjv-nt.ts`, tabla de recuentos sin texto); se comprueba que el nº de entradas del `.bzv` coincide exactamente (8246) y que cada libro cae en su bloque. Las cabeceras de libro y los resúmenes de capítulo del índice se descartan; el marcado ThML se elimina (`src/thml.ts`).

## Resultados de referencia (paquetes)

| Versión | Libros | Capítulos | Versículos | .json.gz |
|---|---|---|---|---|
| VULG | 73 | 1334 | 35809 | 1 455 220 B |
| DRA | 73 | 1334 | 35811 | 1 474 872 B |
| SCIO | 27 (NT) | 260 | 7957 | 327 289 B |

Sin diferencias de capítulos respecto a `vulgateChapters` en ninguna versión.

## Pendientes

- Torres Amat: no existe fuente estructurada de dominio público localizada, por lo que no se ingesta.
- Scío AT: el módulo de CrossWire solo trae NT (`Scope=NTOnly`; `ot.*` vacío). Habría que buscar otra fuente para el Antiguo Testamento.
- Challoner estricto (Douay-Rheims revisión 1749-1752): DRA ingestada es la edición americana de 1899; falta una fuente de la revisión de Challoner si se quiere.
- Las notas/glosas de la Vulgata (Glossa Ordinaria) se descartan; podrían ingestarse como capa aparte.
- Correspondencias de versificación (hebreo ↔ Vulgata) no se generan aquí.

## Paquetes de documentos (cultura, espiritualidad, devocionarios)

Además de las Biblias, `@bc/ingest` genera `DocumentPack` (`kind: "document"`) y los fusiona en `content/catalog.json` con `upsertCatalogEntries` (no toca las entradas de otros ids).

### `culture`: obras de Wikisource

```bash
pnpm --filter @bc/ingest run culture                        # todas las obras (src/culture/works.ts)
pnpm --filter @bc/ingest run culture -- --only azul,martin-fierro
```

- Código en `src/culture/`: `wiki.ts` (cliente de la API con User-Agent genérico, 1 petición cada 1,5 s, reintentos con backoff ante 429/5xx y caché en `raw/culture/<slug>/`; lo ya pedido no se vuelve a pedir), `wikitext.ts` (wikitext → texto plano), `resolve.ts` (resuelve transclusiones `<pages index= from= to= fromsection= tosection= onlysection=/>` pidiendo las páginas `Página:<índice>/<n>`), `build.ts` (fuentes de secciones: lista de páginas, subpáginas por prefijo, rango de escaneo por encabezados `{{t2}}`/`{{t3}}` o por títulos del índice) y `works.ts` (especificaciones y metadatos de cada obra).
- Conversión: se eliminan plantillas (las de contenido —`{{c|…}}`, `{{bc|…}}`, `{{gota|E}}`, `{{may|…}}`…— se desenvuelven, las desconocidas se descartan y se registran en `out/culture/<slug>.log.json`), refs, comentarios, tablas de navegación, categorías, enlaces y formato (`''`, `'''`); se conservan los saltos de verso de `<poem>`. No se inventa ni completa texto: una sección vacía se omite y se anota en el log.
- `meta.source`: licencia «Obra original en dominio público; transcripción de Wikisource bajo CC BY-SA 4.0», `provenanceUrl` con `oldid` de la página principal, `notes` con el historial de autores, `originalSha256` del wikitexto de origen y `retrievedAt` (fijado en la primera ejecución en `raw/culture/<slug>/meta.json` para que el sha256 del paquete sea reproducible).
- Validación incluida en el build: al menos una sección con texto y ningún resto de wikitext (`{{`, `[[`, `<ref`, `'''`).
- Los idiomas `la` y `fr` pueden usar la.wikisource.org / fr.wikisource.org (`wikiLang` en la especificación; hoy solo se usa `la`).
- Obras omitidas y pendientes: ver `docs/SOURCES_AND_LICENSES.md`.

### `markdown`: Markdown propio

```bash
pnpm --filter @bc/ingest run markdown sources/devocionario-catolico.md \
  --id doc.devocionario-catolico --genre prayerbook --authority devotional --language es \
  --collection "Oración y devoción" --source-name "…" --license "…" --provenance-url "…" [--title --subtitle --edition --license-url --retrieved --notes --description]
```

Secciones por encabezados (`#` profundidad 0, `##` 1, `###` 2; un encabezado sin padre sube de nivel; `#` consecutivos sin cuerpo se fusionan). El cuerpo se conserva como markdown (`meta.textFormat = "markdown"`). Se omite el bloque «Índice» (la app genera el suyo). `originalSha256` es el del `.md`.
