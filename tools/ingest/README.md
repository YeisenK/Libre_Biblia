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
