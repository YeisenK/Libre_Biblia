# Fuentes y licencias del contenido

El **código** de Libre Biblia se distribuye bajo **GNU AGPL-3.0-or-later** (ver `LICENSE`).
El **contenido** (textos bíblicos y, en el futuro, comentarios y documentos) tiene su propia licencia, registrada en la tabla `Source` y visible en la app (Ajustes → Fuentes y licencias).

Regla del proyecto: solo se incluye contenido de dominio público o con licencia abierta verificada. Nunca se rellena ni se reconstruye texto que falte en una fuente.

## Traducciones bíblicas incluidas

| Código | Traducción | Edición | Cobertura | Licencia declarada | Procedencia | Descarga |
|---|---|---|---|---|---|---|
| `VULG` | Vulgata Clementina (latín) | Clementina 1598, con la Glossa Ordinaria (ed. Migne 1880), según eBible.org | 73 libros, 1334 caps., 35 809 vers. | Public Domain | [eBible.org · latVUC](https://ebible.org/Bible/details.php?id=latVUC) | `https://eBible.org/Scriptures/latVUC_usfm.zip` |
| `DRA` | Douay-Rheims (inglés) | **Edición americana de 1899** (no es la revisión de Challoner de 1752) | 73 libros, 1334 caps., 35 811 vers. | Public Domain | [eBible.org · engDRA](https://ebible.org/Bible/details.php?id=engDRA) | `https://eBible.org/Scriptures/engDRA_usfm.zip` |
| `SCIO` | Felipe Scío de San Miguel, *La Biblia Vulgata Latina traducida en Español* | 2.ª ed., 1797 | **Solo Nuevo Testamento**: 27 libros, 260 caps., 7957 vers. | Public Domain (`DistributionLicense` del módulo) | [CrossWire · SpaScioNT](https://crosswire.org/ftpmirror/pub/sword/raw/mods.d/spasciont.conf) | `https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/SpaScioNT.zip` |
| `SBLM` | *Santa Biblia libre para el mundo* (español de España) | Traducción libre moderna, **borrador** de eBible.org, **sin aprobación eclesiástica** | 73 libros, 35 379 vers. (numeración hebrea) | Public Domain | [eBible.org · spablm](https://ebible.org/Bible/details.php?id=spablm) | `https://eBible.org/Scriptures/spablm_usfm.zip` |
| `BLL` | *Santa Biblia libre Latinoamericana* | Traducción libre moderna, **borrador** de eBible.org, **sin aprobación eclesiástica** | 73 libros, 35 379 vers. (numeración hebrea) | Public Domain | [eBible.org · spabll](https://ebible.org/Bible/details.php?id=spabll) | `https://eBible.org/Scriptures/spabll_usfm.zip` |

Los sha256 de cada archivo descargado y la fecha de obtención se guardan en `Source.checksum` / `Source.retrievedAt` y en `tools/ingest/raw/<CODE>/manifest.json`. Para reproducir la carga: `pnpm ingest`.

### Notas de edición
- **SBLM y BLL** siguen la numeración hebrea (Sal 23 = «El Señor es mi pastor»). Ester y Daniel se toman de los libros griegos de la fuente (ESG, DAG): Daniel con 14 capítulos; en Ester las adiciones griegas están completas pero integradas en versículos largos según la numeración de la fuente (1,1; 3,13; 5,1; 8,13; 10,4-14). Se excluyen los libros fuera del canon católico (1-2 Esdras apócrifos, Oración de Manasés, Salmo 151, 3-4 Macabeos).
- **Versificación**: las tres siguen la numeración de la Vulgata (Salmos según la LXX, Ester con 16 capítulos, Daniel con 14, Baruc 6 = Carta de Jeremías).
- **VULG** conserva los corchetes editoriales `[ ]` de la fuente; las glosas se descartan.
- Notas al pie, referencias cruzadas y títulos de sección de las fuentes no se importan.

## Cultura hispánica (Wikisource en español)

Paquetes `doc.*` generados con `pnpm --filter @bc/ingest run culture` (API de es.wikisource.org, caché en `tools/ingest/raw/culture/`, 1 petición cada 1,5 s). Licencia de todos: **obra original en dominio público; transcripción de Wikisource bajo CC BY-SA 4.0** ([texto](https://creativecommons.org/licenses/by-sa/4.0/deed.es)). Los autores de cada transcripción son el historial de la página (`?action=history`); cada paquete guarda en `source.provenanceUrl` el enlace con `oldid` (revisión exacta) y en `source.originalSha256` el hash del wikitexto de origen.

| Paquete | Obra | Edición base (verificada en Wikisource) | Páginas con `oldid` | Notas |
|---|---|---|---|---|
| `doc.romancero-viejo` | Romances anónimos (31: doncella guerrera, Alhama, Abenámar, romances del Cid, Gerineldo, etc.) | Versiones modernizadas; las páginas **no declaran edición base** | una página por romance (ver `provenanceUrl` y el historial) | Excluidos: romances de autor conocido (p. ej. Quevedo, Lorca) y el «enamorado y la muerte» (recogido por Menéndez Pidal, protegido). Pendiente verificar la edición de cada romance. |
| `doc.versos-sencillos` | José Martí, *Versos sencillos* (prólogo + I–XLVI) | Transcripción sin edición declarada (la página prevé la «Colección de libros cubanos», 1927) | https://es.wikisource.org/wiki/Versos_sencillos | Martí † 1895 |
| `doc.azul` | Rubén Darío, *Azul...* | *Obras completas*, vol. IV, Mundo Latino, Madrid, 1917 (escaneo IA) | https://es.wikisource.org/wiki/Azul... | Darío † 1916. Hay páginas del escaneo sin revisar (ver notas del paquete). |
| `doc.poesias-sor-juana` | Sor Juana Inés de la Cruz, 28 poemas (Redondillas «Hombres necios», sonetos, etc.) | Transcripciones modernizadas, edición no declarada | https://es.wikisource.org/wiki/Autor:Sor_Juana_Inés_de_la_Cruz | † 1695. **«Primero sueño» no se incluye**: la página de Wikisource es la edición de Antonio Alatorre († 2010, protegida). |
| `doc.tradiciones-peruanas-primera-serie` | Ricardo Palma, *Tradiciones peruanas*, primera serie (14 tradiciones) | Tomo I, Montaner y Simón, Barcelona, 1893 (ortografía modernizada) | https://es.wikisource.org/wiki/Tradiciones_peruanas_-_Primera_serie | Palma † 1919. La mayoría de las páginas del escaneo están **sin revisar** (OCR de calidad 1): puede haber errores de OCR. |
| `doc.martin-fierro` | José Hernández, *El gaucho Martín Fierro* (1894) y *La vuelta de Martín Fierro* (2.ª ed., Coni, 1879) | Ortografía original | https://es.wikisource.org/wiki/El_Gaucho_Martín_Fierro_(1894) | Hernández † 1886 |
| `doc.comentarios-reales` | Inca Garcilaso, *Comentarios reales*, Primera parte (solo capítulos transcritos) | Transcripción modernizada, edición no declarada | https://es.wikisource.org/wiki/Comentarios_reales_(Primera_parte) | Garcilaso † 1616. Es una antología, no la obra completa. |

### Pendientes y omisiones (cultura hispánica)
- **Cantar de mio Cid**: omitido. Wikisource solo transcribe el prólogo de la edición de Sánchez (1779) (hasta la pág. 321 del escaneo) y no el poema; las ediciones de Bello (1881) y De la Barra (1900) solo tienen 12 páginas transcritas. La de Menéndez Pidal está protegida. Pendiente: transcribir Janer 1864/Bello 1881 o usar otra fuente.
- **Primero sueño** (sor Juana): ver tabla; pendiente buscar una edición antigua (p. ej. Fama y obras póstumas, 1700).
- **Romance del conde Arnaldos** y **del rey don Rodrigo**: no existen en Wikisource (los romances del Cid sí se incluyen).
- **Popol Vuh**: no se incluye; la versión de Wikisource es la de Asturias (1927), protegida.
- **Comentarios reales**: solo capítulos transcritos de la primera parte; falta la segunda parte (*Historia general del Perú*).
- Ediciones sin base declarada (romances, sor Juana, Martí, Garcilaso): confirmar la edición de origen antes de redistribuir.

## Oración y devoción

| Paquete | Obra | Licencia | Procedencia |
|---|---|---|---|
| `doc.devocionario-catolico` | *Devocionario católico: oraciones, devociones y prácticas de piedad* (formato Markdown, `textFormat: 'markdown'`, autoridad `devotional`) | CC BY-SA 4.0 (recopilación); oraciones tradicionales de dominio público. Las respuestas y fórmulas de la Misa provienen de traducciones litúrgicas aprobadas y se incluyen como citas breves de referencia; para la celebración consúltese el Misal vigente | `tools/ingest/sources/devocionario-catolico.md` (recopilación del autor del proyecto) |

Se genera con `pnpm --filter @bc/ingest run markdown sources/devocionario-catolico.md --id doc.devocionario-catolico ...` (el índice manual se omite; la app genera el suyo). No es texto litúrgico oficial.

## Espiritualidad clásica

Misma licencia y mecanismo que arriba (Wikisource en español, latín o francés; CC BY-SA 4.0 sobre la transcripción). Criterio: autor **y traductor** fallecidos hace más de 80 años; si el traductor no consta o es moderno, no se incluye.

| Paquete | Obra | Edición base | Idioma | Notas |
|---|---|---|---|---|
| `doc.confesiones-agustin` | San Agustín, *Confessiones* (13 libros) | *Patrologia Latina* t. 32, ed. Migne, París, 1841 (vía la.wikisource.org) | la | Texto latino original (autoridad `patristic`): no se halló traducción española antigua con traductor de dominio público verificado. |
| `doc.libro-de-la-vida-teresa` | Santa Teresa de Jesús, *Libro de la vida* (capítulos transcritos) | Espasa-Calpe, Colección Universal 1003-1005, Madrid, 1927 (ortografía modernizada) | es | Pendiente verificar el editor de la edición de 1927; el tomo II está sin transcribir. |
| `doc.poesias-santa-teresa` | Poesías de santa Teresa (5) | Transcripciones sin edición declarada | es | |
| `doc.poesias-san-juan-de-la-cruz` | San Juan de la Cruz: Cántico espiritual, Noche oscura, Llama de amor viva y otros 9 poemas | Transcripciones sin edición declarada | es | Los tratados en prosa no están transcritos en Wikisource. |
| `doc.imitacion-de-cristo` | Tomás de Kempis (atribuida), *Imitación de Cristo* / *De imitatione Christi*, 4 libros (25, 12, 59 y 18 capítulos) | Texto latino de Wikisource (*De imitatione Christi*, revisión oldid=129152); la página indica «editio: incognita» | la | Original latino (autoridad `spiritual_classic`). Sin traducción española verificable (ver abajo). Derechos: obra del siglo XIV; transcripción CC BY-SA 4.0. |

### Pendientes y omisiones (espiritualidad clásica)
- **Las moradas / Castillo interior** y **Camino de perfección** (santa Teresa): no existen transcritos en es.wikisource (solo escaneos o una única página). Pendiente: otra fuente de dominio público.
- **Imitación de Cristo, traducción española**: no existe transcripción en es.wikisource ni en Gutenberg. Revisadas en Internet Archive: (a) *De la imitación de Christo… nuevamente reducidos a la fidelidad del original latino* (Barcelona, Imprenta de J. M. de Grau, 1842), traductor anónimo («Un sacerdote») y solo escaneo con OCR de baja calidad, sin revisión: no es transcripción verificable; (b) subidas recientes («Imitación de Cristo», 1876, y «Imitación de Cristo o menosprecio del mundo», 2020) sin procedencia ni edición verificables (la de 2020 atribuye la traducción a Fray Luis de León y la indexa como de Granada): no se usan. Las traducciones de Nieremberg (1724 y 1747) figuran en Internet Archive solo como escaneos. Pendiente: una transcripción española con traductor fallecido hace más de 80 años y texto revisado.
- **Subida del Monte Carmelo / Noche oscura (tratado)** de san Juan de la Cruz: no transcritos.
- **Historia de un alma** (santa Teresa de Lisieux): omitida. La única transcripción útil es la de fr.wikisource (ed. 1912), pero sus letras capitales, epígrafes y títulos de capítulo están en imágenes o plantillas no convertibles sin perder texto; no se completa a mano. Pendiente: traducción española antigua de dominio público o transcripción completa.
- Traducción española antigua de las *Confesiones*: no encontrada; se incluye el original latino.

## Leccionario (referencias de las lecturas de la Misa)

- **Fuente**: Evangelizo.org, API pública `https://publication.evangelizo.ws/SP/days/AAAA-MM-DD/readings` (su `robots.txt` permite todo; la API publica una cabecera `ratelimit`). **La fuente no declara ninguna licencia** para estos datos.
- **Qué se guarda**: SOLO referencias (cita y tipo de lectura: primera lectura, salmo, segunda lectura, Evangelio) ya consolidadas por clave de día litúrgico en `packages/shared/src/lectionary/data.json`. Nunca el texto de las lecturas, ni antífonas/estribillos, ni comentarios. El texto que se muestra sale de la Biblia que el usuario tenga instalada.
- **Fechas**: 2017-12-03 a 2026-11-28 (3283 fechas; ciclos A, B y C tres veces y años ferales I/II), una única petición por fecha, como máximo 1 por segundo, con `User-Agent: LibreBiblia-ingest/0.1 (+https://github.com/YeisenK/Libre_Biblia)`. Las respuestas en bruto (solo referencias, el texto se descarta al guardarlas) viven en `tools/ingest/raw/evangelizo/` (ignorado por git). No hubo 429/403 ni desafíos anti-bot.
- **Numeración**: `hebrew` (Salmos con numeración hebrea y títulos contados como versículos; el resto, la de la Biblia del Pueblo de Dios). Se convierte a la de cada Biblia con `apps/web/src/lib/versify.ts`.
- **Calendario de la fuente**: Epifanía el 6 de enero, Ascensión y Corpus Christi en domingo (el dataset lo registra en `options`); para otras opciones nacionales faltan unos pocos domingos (p. ej. el 7.º de Pascua si la Ascensión es en jueves) y la app recurre al ciclo temático.
- **Uso y atribución**: se usan únicamente las citas, como datos de calendario litúrgico. La app muestra «Referencias de las lecturas: Evangelizo.org» junto a las lecturas, en Ajustes y en la página Fuentes. Si la fuente pidiera retirarlos, basta borrar `data.json` y la app vuelve al ciclo temático.
- **Generación y control de calidad**: `tools/ingest/src/lectionary/` (descarga, consolidación y validación); informe de discrepancias, claves con una sola ocurrencia y fallos de validación en `tools/ingest/out/lectionary-report.json`. Detalles en `packages/shared/src/lectionary/README.md`.

## Datos de versificación

Tablas de conversión de numeración (capítulo/versículo) entre las tradiciones `vulgate`, `english`, `hebrew` y `greek`, generadas a partir de **STEPBible TVTMS** (*Translators' Versification Traditions with Methodology for Standardisation*).

- Fuente: https://github.com/STEPBible/STEPBible-Data (carpeta `Versification/`, archivo «TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt»).
- Licencia: **CC BY 4.0**. Texto del archivo: «Data created by www.STEPBible.org based on work at Tyndale House Cambridge (CC BY 4.0)». El README del repositorio declara «CC BY 4.0» y pide atribuir a Tyndale House y STEPBible.org con enlace a STEPBible.github.io/STEPBible-Data, anotar los cambios hechos y no publicar copias del archivo original (por eso `tools/ingest/raw/` está en `.gitignore` y solo se versiona el resultado derivado).
- Atribución: datos de STEPBible.org / Tyndale House, Cambridge (CC BY 4.0), https://github.com/STEPBible/STEPBible-Data.
- Cambios realizados: se usa solo la sección «Condensed»; se reducen las columnas English/Hebrew/Latin/Greek a tramos compactos `origen>destino` (solo versículos que cambian); las celdas de libros fuera del canon de 73 libros se ignoran; Sus/Bel/LJe se mapean a Dn 13, Dn 14 y Bar 6; el Cántico de los tres jóvenes (Dn 3,24-90 Vg) y las adiciones de Ester (Est 10,4-16,24 Vg) se codifican a mano porque TVTMS usa pseudo-capítulos (A-F) o deja comentadas esas filas.
- Generador: `pnpm --filter @bc/ingest versification` → `packages/shared/src/versification/data.ts`. Detalles y validación en `packages/shared/src/versification/README.md`.

## Pendientes

| Recurso | Situación |
|---|---|
| Torres Amat (1825) | Dominio público, pero **no existe** fuente digital estructurada verificable. Solo hay facsímiles (Wikisource DjVu, bibliotecas). Requiere OCR y revisión humana antes de incluirla. |
| Scío — Antiguo Testamento | El único módulo digital encontrado (CrossWire) es solo del NT. |
| Douay-Rheims Challoner (1749-52) | No se encontró en formato estructurado. Candidatos: Project Gutenberg #8300 (HTML), Internet Archive. |
| `VerseMapping` (Vulgata ↔ hebrea) | Tabla creada, todavía sin datos. |

## Candidatas para fases siguientes (por verificar)
Referencias cruzadas de OpenBible.info (CC-BY), comentario Haydock (1859) y *Catena Aurea* (traducciones de dominio público), Catholic Encyclopedia (1913), Padres de la Iglesia de Schaff (ANF/NPNF), y para las lenguas originales OSHB (hebreo, CC-BY) y SBLGNT/MorphGNT. Los textos del Catecismo y de los documentos pontificios recientes tienen copyright de la Santa Sede (Libreria Editrice Vaticana): solo se enlazarán o citarán salvo que haya licencia.
