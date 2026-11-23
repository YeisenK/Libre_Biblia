# Arte sacro

Cuadros de dominio público de Wikimedia Commons para la app (ver `docs/DISENO_V2.md`, sección «Arte»).

- `catalog.mjs`: lista clave(s) → archivo de Commons → foco del recorte, con título, artista y año en español.
- `fetch-art.mjs`: consulta la API de Commons (metadatos y licencia), **se detiene si alguna obra no es dominio público/CC0**, descarga la miniatura de 960 px (tamaño estándar de Commons, menos limitado) a `tools/art/.cache/` (ignorada por git), la recorta (máx. 4:5 alrededor del foco), la convierte a WebP de 900 px de ancho (calidad 68, bajando si supera 120 KB) en `apps/web/public/art/<clave-con-guiones>.webp` y regenera el bloque `GENERADO` de `apps/web/src/lib/art.ts`.

```
node tools/art/fetch-art.mjs          # todo
node tools/art/fetch-art.mjs --meta   # solo comprobar licencias
```

Usa `sharp` de `apps/web`. Envía `User-Agent: LibreBibliaArt/1.0` y espera entre peticiones (Commons devuelve 429 con rapidez en `upload.wikimedia.org`; el script respeta `Retry-After`, así que una primera ejecución puede tardar varios minutos). Lo descargado se reutiliza de la caché.

Un mismo cuadro sirve a varias claves (`keys`; la primera da nombre al archivo). Para añadir arte: nueva entrada en `catalog.mjs` y volver a ejecutar.

## Notas de licencia y reutilizaciones

- Fátima y san Martín de Porres no tienen imagen libre anterior a 1931 adecuada: Fátima reutiliza la Virgen del Rosario de Murillo y san Martín la de san Francisco de Asís de Zurbarán (grupo «santos»). Divina Misericordia reutiliza la Resurrección de Murillo (la imagen de Kazimirowski es de 1934).
- Guadalupe usa una fotografía CC0 de la imagen de la tilma; santa Teresita, una fotografía de 1895.
- Las fotos de lienzos «in situ» con licencia CC BY-SA se descartan; solo se aceptan `Public domain`/PD-Art/CC0.
