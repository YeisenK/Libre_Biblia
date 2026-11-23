# Arte sacro

Cuadros de dominio público de Wikimedia Commons para la app (ver `docs/DISENO_V2.md`, sección «Arte»).

- `catalog.mjs`: lista clave(s) → archivo de Commons → foco del recorte, con título, artista y año en español.
- `fetch-art.mjs`: consulta la API de Commons (metadatos y licencia; se guardan en `.cache/meta.json`), **se detiene si alguna obra no es dominio público/CC0**, descarga la miniatura de 720 px (`iiurlwidth=720`; si falla, la de 960 px) a `tools/art/.cache/` (ignorada por git), la recorta alrededor del foco (entre 4:5 y 4:3), la convierte a WebP de 720 px de ancho (calidad 70, bajando hasta ≤ 70 KB) en `apps/web/public/art/<clave-con-guiones>.webp` y regenera el bloque `GENERADO` de `apps/web/src/lib/art.ts`.

```
node tools/art/fetch-art.mjs          # todo (varias pasadas hasta completar; reutiliza la caché)
node tools/art/fetch-art.mjs --meta   # solo comprobar licencias
```

Usa `sharp` de `apps/web`. Envía un `User-Agent` descriptivo genérico, espera ~3 s entre peticiones a `upload.wikimedia.org`, reintenta con espera exponencial ante 429/5xx/«fetch failed» y hace hasta 4 pasadas (60 s entre ellas); si quedan imágenes pendientes sale con código 2 y basta volver a ejecutarlo. Fuerza IPv4 primero (`dns.setDefaultResultOrder`). Lo descargado se reutiliza de la caché.

## Claves

- `set:<conjunto>`, `mystery:<conjunto>-<n>`, `novena:<id>`, `moment:morning|midday|afternoon|night`, `category:<id>`, `home:default`.
- `prayer:<id>`: una imagen propia por oración (ids en `tools/ingest/sources/prayers/prayers/*.json`). La UI pasa `[prayer:<id>, category:<cat>, home:default]` (`artForAny`), así que una oración sin imagen cae a la de su categoría.
- `book:<packId>` (`bible.BLL`, `doc.azul`…): portada de la Biblioteca. Respaldos genéricos `book:bible` y `book:doc` para packs de otros catálogos (`bookArtKeys`).
- `art.test.ts` exige imagen propia para cada oración, novena, categoría, momento y libro del catálogo, ≤ 75 KB por imagen y ≤ 9 MB en total.

Un mismo cuadro sirve a varias claves (`keys`; la primera da nombre al archivo). Para añadir arte: nueva entrada en `catalog.mjs` y volver a ejecutar.

## Notas de licencia y reutilizaciones

- Fátima (novena y oración) usa la Virgen del Rosario de Sassoferrato; san Martín de Porres, san Diego de Alcalá de Murillo (no hay imagen libre adecuada del santo). Divina Misericordia y la coronilla usan el hijo pródigo de Rembrandt (la imagen de Kazimirowski es de 1934).
- Los libros con retrato usan fotografías o grabados de dominio público (Darío, Garcilaso, Tomás de Kempis, Martí, Teresita con Céline).
- Guadalupe usa una fotografía CC0 de la imagen de la tilma; santa Teresita, una fotografía de 1895.
- Las fotos de lienzos «in situ» con licencia CC BY-SA se descartan; solo se aceptan `Public domain`/PD-Art/CC0.
