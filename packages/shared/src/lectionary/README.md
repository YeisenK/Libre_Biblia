# Leccionario de la Misa (solo referencias)

`data.json` contiene, por **clave de día litúrgico**, las citas de las lecturas de la Misa (primera lectura, salmo, segunda
lectura y Evangelio). No contiene texto bíblico ni comentarios.

- **Fuente**: Evangelizo.org, API pública `publication.evangelizo.ws/SP/days/AAAA-MM-DD/readings` (robots.txt lo permite; la
  fuente no declara licencia para estos datos). Atribución obligatoria en la app: «Referencias de las lecturas: Evangelizo.org».
- **Generación**: `tools/ingest/src/lectionary/` (descarga 1 petición/s con caché y consolidación por clave). Informe de
  discrepancias, claves con una sola ocurrencia y validación en `tools/ingest/out/lectionary-report.json`.
- **Numeración (`versification`)**: `hebrew`. Los Salmos usan el número hebreo (Sal 23 = «El Señor es mi pastor») y cuentan los
  títulos como versículos (Sal 51,3 = «Misericordia, Dios mío»). Para leerlos en otra Biblia hay que convertirlos
  (`apps/web/src/lib/versify.ts`, `toVersion`). El resto de libros siguen la numeración de la fuente (Biblia del Pueblo de Dios).
- **Citas**: `Jn 14,15-16.23-26` (tramos discontinuos; ver `parseMassRef`/`segments`), `Is 63,16-17.19; 64,2-7` (cambio de
  capítulo). Las letras de parte de versículo (`23b`, `2a`…) se ignoran: se usan versículos completos. Cuando la fuente da la
  lectura en dos tramos de capítulos consecutivos (`Mc 14,1-72` + `Mc 15,1-47`) se unen en `Mc 14,1-15,47`.
- **Formato**: `{ version, source, versification, from, to, options, days: { clave: ["1|cita", "P|cita", "2|cita", "G|cita"] } }`
  (1 primera lectura, P salmo, 2 segunda lectura, G Evangelio; alternativas, si las hubiera, separadas por « / »).
- **Claves** (ver `keys.ts`): `cel:<id>[:A|B|C]` (domingos, solemnidades, fiestas y días especiales), `d:MM-DD` (santoral con
  lecturas propias), `fer:ord:<sem>:<día>:<I|II>`, `fer:adv:`, `fer:advd:MM-DD`, `fer:xmas:MM-DD`, `fer:postepi:<n>`,
  `fer:lent:`, `fer:easter:`. `getReadings(fecha, opciones)` calcula la clave de cualquier fecha (pasada o futura).

## Estado del dataset (2017-12-03 → 2026-11-28)

- 3283 fechas descargadas → 740 claves; 90 con discrepancias entre años (casi todas variaciones menores de versículos del
  salmo o de la forma larga/breve del Evangelio; gana la mayoría), 4 sin mayoría (se elige la variante más reciente) y 11 con
  una sola ocurrencia. Detalle en `tools/ingest/out/lectionary-report.json`.
- Opciones del calendario detectadas en la fuente: Epifanía el 6 de enero, Ascensión y Corpus Christi en domingo.
- Validación: 1771 de 1772 citas distintas existen en SBLM/DRA (tras convertir la numeración hebrea). La excepción
  (`Ex 14,21-41`, jueves de la semana 16) es un error de la propia fuente.
- Huecos conocidos: domingo 12.º del T. O. del ciclo C (no ocurre en el rango con las opciones de la fuente) y domingo 7.º
  de Pascua con la Ascensión en jueves; en esos días la app usa el ciclo temático.
- Cobertura 2027: 100 % (opciones de la fuente) / 99,5 % (opciones por defecto de la app); 2028: 99,7 % / 99,2 %.
