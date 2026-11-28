# Fuentes y licencias del contenido

El **código** de Lux se distribuye bajo **GNU AGPL-3.0-or-later** (ver `LICENSE`).
El **contenido** (textos bíblicos y, en el futuro, comentarios y documentos) tiene su propia licencia, registrada en la tabla `Source` y visible en la app (Ajustes → Fuentes y licencias).

Regla del proyecto: solo se incluye contenido de dominio público o con licencia abierta verificada. Nunca se rellena ni se reconstruye texto que falte en una fuente.

## Traducciones bíblicas incluidas

| Código | Traducción | Edición | Cobertura | Licencia declarada | Procedencia | Descarga |
|---|---|---|---|---|---|---|
| `VULG` | Vulgata Clementina (latín) | Clementina 1598, con la Glossa Ordinaria (ed. Migne 1880), según eBible.org | 73 libros, 1334 caps., 35 809 vers. | Public Domain | [eBible.org · latVUC](https://ebible.org/Bible/details.php?id=latVUC) | `https://eBible.org/Scriptures/latVUC_usfm.zip` |
| `DRA` | Douay-Rheims (inglés) | **Edición americana de 1899** (no es la revisión de Challoner de 1752) | 73 libros, 1334 caps., 35 811 vers. | Public Domain | [eBible.org · engDRA](https://ebible.org/Bible/details.php?id=engDRA) | `https://eBible.org/Scriptures/engDRA_usfm.zip` |
| `SCIO` | Felipe Scío de San Miguel, *La Biblia Vulgata Latina traducida en Español* | 2.ª ed., 1797 | **Solo Nuevo Testamento**: 27 libros, 260 caps., 7957 vers. | Public Domain (`DistributionLicense` del módulo) | [CrossWire · SpaScioNT](https://crosswire.org/ftpmirror/pub/sword/raw/mods.d/spasciont.conf) | `https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/SpaScioNT.zip` |
| `TA` | Félix Torres Amat, *La Sagrada Biblia, nuevamente traducida de la Vulgata latina al español* (traducción católica de la Vulgata; 1.ª ed. Madrid 1823-1825, con licencias eclesiásticas de la época) | Edición de París, Libr. de Salvá, **1836**, tomos XIII-XV (NT); transcripción corregida de es.wikisource (ProofreadPage nivel 3-4) | **Parcial: 15 de 27 libros del NT** (Mt, Mc, Lc, Jn, Hch, Rm, 1 Co, St, 1-2 P, 1-3 Jn, Jud, Ap): 192 caps., 6486 vers. Falta el resto del NT y todo el AT | Texto: dominio público (Torres Amat † 1847). Transcripción: contribuciones de Wikisource bajo CC BY-SA 4.0 (se atribuye por precaución) | [es.wikisource · La Sagrada Biblia (XIII)](https://es.wikisource.org/wiki/La_Sagrada_Biblia_(XIII)), [(XIV)](https://es.wikisource.org/wiki/La_Sagrada_Biblia_(XIV)); escaneos: Internet Archive [`lasagradabiblian13torr`](https://archive.org/details/lasagradabiblian13torr), [`lasagradabiblian1415torr`](https://archive.org/details/lasagradabiblian1415torr) | API de MediaWiki (`pnpm --filter @bc/ingest exec tsx src/cli.ts torres-amat`) |
| `SBLM` | *Santa Biblia libre para el mundo* (español de España) | Traducción libre moderna, **borrador** de eBible.org, **sin aprobación eclesiástica** | 73 libros, 35 379 vers. (numeración hebrea) | Public Domain | [eBible.org · spablm](https://ebible.org/Bible/details.php?id=spablm) | `https://eBible.org/Scriptures/spablm_usfm.zip` |
| `BLL` | *Santa Biblia libre Latinoamericana* | Traducción libre moderna, **borrador** de eBible.org, **sin aprobación eclesiástica** | 73 libros, 35 379 vers. (numeración hebrea) | Public Domain | [eBible.org · spabll](https://ebible.org/Bible/details.php?id=spabll) | `https://eBible.org/Scriptures/spabll_usfm.zip` |

Los sha256 de cada archivo descargado y la fecha de obtención se guardan en `Source.checksum` / `Source.retrievedAt` y en `tools/ingest/raw/<CODE>/manifest.json`. Para reproducir la carga: `pnpm ingest`.

### Notas de edición
- **SBLM y BLL** siguen la numeración hebrea (Sal 23 = «El Señor es mi pastor»). Ester y Daniel se toman de los libros griegos de la fuente (ESG, DAG): Daniel con 14 capítulos; en Ester las adiciones griegas están completas pero integradas en versículos largos según la numeración de la fuente (1,1; 3,13; 5,1; 8,13; 10,4-14). Se excluyen los libros fuera del canon católico (1-2 Esdras apócrifos, Oración de Manasés, Salmo 151, 3-4 Macabeos).
- **TA (Torres Amat)**: se omiten las notas al pie (el formato de paquete solo admite versículos de texto llano), cabeceras, sumarios, números de página y guiones; las cursivas (palabras que el traductor añade al original latino) se pasan a texto llano. Ortografía del original (1836) conservada («Jesus», «ácia», «á»). Erratas de la transcripción corregidas en `tools/ingest/src/torres-amat/parse.ts` (`TA_FIXES`, verificadas con el escaneo o el contexto). Errata de la propia edición: Mt 14,11 queda truncado y falta el v. 12. Calidad medida: sin restos de marcado; el recuento de versículos por capítulo coincide con el de la Vulgata Clementina en 191 de 192 capítulos (única diferencia: Mt 14).
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

## Recursos incluidos en la app (primer uso sin red)

Se instalan desde `/packs/*.pack` (ver `docs/PLAN_LUX.md`, sección 7): `bible.BLL` (Biblia libre Latinoamericana, dominio público según eBible.org; **borrador sin aprobación eclesiástica**), `bible.SCIO` (Scío de San Miguel, solo Nuevo Testamento, dominio público), `bible.VULG` (Vulgata Clementina, dominio público), `prayers.es` (CC BY-SA 4.0) y la voz `audio.oraciones.fraile`. Las licencias de cada texto son las de su tabla en «Traducciones bíblicas incluidas».

### Voz «Fraile» (audio sintético)
- **Qué es:** 72 clips del Rosario generados con Juglar (proyecto propio, licencia MIT) usando el modelo de diseño de voz **Qwen3-TTS-12Hz-1.7B-VoiceDesign** (Qwen/Alibaba). La voz se describe por texto; no se clona ninguna voz real.
- **Licencia del modelo:** Apache-2.0 (campo `license` de la ficha en Hugging Face, verificado el 25-11-2026 en la web y en la copia local del modelo). Apache-2.0 permite uso comercial y redistribuir la salida; el modelo **no** se distribuye con la app, solo el audio resultante.
- **Licencia del audio:** CC BY-SA 4.0 (misma que los textos de `prayers.es`); los pasajes bíblicos leídos son de la BLL (dominio público). Se declara el audio como sintético.
- **Actualización:** el paquete lleva `version` (hoy `2026.11.22`). Si se regenera, se sube la versión en `content/catalog.json`, se recompila y la app reinstala la voz solo si la versión incluida es más nueva que la instalada.

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
| `doc.historia-de-un-alma` | Santa Teresa del Niño Jesús (Teresita de Lisieux, † 1897), *Histoire d’une âme* (texto francés): Préface, Introduction, 12 capítulos, acto de ofrenda y oraciones, cartas y poesías (117 secciones con texto) | *Histoire d’une âme écrite par elle-même*, «édition de 1912» (Lisieux), transcrita en fr.wikisource desde el escaneo «Histoire d’une âme (édition de 1912).pdf»; revisión [oldid=16100792](https://fr.wikisource.org/w/index.php?title=Histoire_d%E2%80%99une_%C3%A2me&oldid=16100792) | fr | Original francés (autoridad `spiritual_classic`). Licencia: obra original en dominio público; transcripción CC BY-SA 4.0 (autores en el [historial](https://fr.wikisource.org/w/index.php?title=Histoire_d%E2%80%99une_%C3%A2me&action=history)). Omitidas las cartas de aprobación, «Conseils et Souvenirs», «Pluie de Roses» y la exhumación (textos editoriales de terceros). 19 páginas del escaneo sin revisar. |
| `doc.ciudad-de-dios` | San Agustín, *La ciudad de Dios*: proemio y 22 libros, 662 capítulos (colección «Padres de la Iglesia», autoridad `patristic`) | Traducción española de José Cayetano Díaz de Beyral (siglo XVIII); es.wikisource no declara el escaneo, pero el autor consigna la reedición de la Biblioteca Clásica, Viuda de Hernando, Madrid, 1893; revisión [oldid=1378414](https://es.wikisource.org/w/index.php?title=La_ciudad_de_Dios&oldid=1378414) | es | Se descartan los rótulos modernos intercalados (títulos de libro y «Prólogo» del libro I, de otra traducción posiblemente con derechos). Los índices de capítulos de cada libro se omiten; los argumentos quedan como primera línea de cada capítulo. Conserva erratas de la transcripción. |
| `doc.perfecta-casada` | Fray Luis de León (†1591), *La perfecta casada*: dedicatoria y 21 capítulos | Biblioteca Clásica Española, Madrid, 1884 (escaneo HathiTrust osu.32435013568332, ortografía modernizada); [oldid=1578611](https://es.wikisource.org/w/index.php?title=La_perfecta_casada&oldid=1578611) | es | Obra completa. |
| `doc.exclamaciones-teresa` | Santa Teresa de Jesús, *Exclamaciones del alma a Dios* (17 capítulos) | *Escritos de Santa Teresa*, ed. Vicente de La Fuente, BAE vol. 53, Madrid, Rivadeneyra, 1877; [oldid=1482748](https://es.wikisource.org/w/index.php?title=Exclamaciones_o_meditaciones_del_alma_a_su_Dios&oldid=1482748) | es | Edición de 1877 (editor † 1889). |

## Apologética y pensamiento católico (Project Gutenberg)

Fuente: **Project Gutenberg** (https://www.gutenberg.org), descargando el TXT directamente del espejo oficial de ibiblio, `https://gutenberg.pglaf.org/` (el 25-26-11-2026 www.gutenberg.org respondía 503 de mantenimiento). Se bajó el índice `GUTINDEX.ALL` una vez y un único archivo por obra, con ≥1,5 s entre peticiones, caché en `tools/ingest/raw/gutenberg/` y UA genérico (`LibreBiblia-ingest/0.1`). El `robots.txt` del espejo no existe (404). Convertidor: `tools/ingest/src/culture/gutenberg.ts` (quita cabecera, licencia y «Produced by», que se conservan en `source.notes`, el marcado de cursiva y los índices; reajusta párrafos), obras en `works-gutenberg.ts`, se generan con `pnpm --filter @bc/ingest culture --only <slug>`.

**Criterio de dominio público**: Gutenberg solo publica textos PD en EE. UU. Para España y México se exige además autor (y traductor, si hay) fallecidos hace más de 80 años (España, autores † antes de 1987) y más de 100 años (México). Balmes († 9-7-1848) cumple ambos (80 años: 1928; 100 años: 1948); ambas obras están en español original, sin traductor, y las ediciones son reimpresiones del texto sin aparato editorial moderno.

| Paquete | Obra | Edición base | Gutenberg | Notas |
|---|---|---|---|---|
| `doc.protestantismo-catolicismo-balmes` | Jaime Balmes, *El Protestantismo comparado con el Catolicismo en sus relaciones con la civilización europea*, tomos I y II (prólogo, 37 capítulos, notas de cada tomo; colección «Apologética y pensamiento católico», autoridad `theological_opinion`) | 10.ª ed., Barcelona, Imprenta del «Diario de Barcelona», 1921 (escaneo Internet Archive/Canadian Libraries; transcrito por DP) | ebook #59797 (`5/9/7/9/59797/59797-8.txt`, 23-6-2019) | Ortografía de la edición. Se omiten los índices. |
| `doc.el-criterio-balmes` | Jaime Balmes, *El Criterio* (22 capítulos con apartados «§» y notas; autoridad `literary`: ensayo de lógica práctica, no magisterio) | Nueva edición, París, A. Bouret y Morel, 1849 (escaneo BnF/Gallica) | ebook #28929 (`2/8/9/2/28929/28929-8.txt`, 22-5-2009) | Ortografía de 1849 («atencion», «razon»). Se omite el índice de materias. |

### Pendientes y omisiones (espiritualidad clásica)
- **Las moradas / Castillo interior** y **Camino de perfección** (santa Teresa): no existen transcritos en es.wikisource (solo escaneos o una única página). Pendiente: otra fuente de dominio público.
- **Imitación de Cristo, traducción española**: no existe transcripción en es.wikisource ni en Gutenberg. Revisadas en Internet Archive: (a) *De la imitación de Christo… nuevamente reducidos a la fidelidad del original latino* (Barcelona, Imprenta de J. M. de Grau, 1842), traductor anónimo («Un sacerdote») y solo escaneo con OCR de baja calidad, sin revisión: no es transcripción verificable; (b) subidas recientes («Imitación de Cristo», 1876, y «Imitación de Cristo o menosprecio del mundo», 2020) sin procedencia ni edición verificables (la de 2020 atribuye la traducción a Fray Luis de León y la indexa como de Granada): no se usan. Las traducciones de Nieremberg (1724 y 1747) figuran en Internet Archive solo como escaneos. Pendiente: una transcripción española con traductor fallecido hace más de 80 años y texto revisado.
- **Subida del Monte Carmelo / Noche oscura (tratado)** de san Juan de la Cruz: no transcritos.
- **Historia de un alma**: incluida en francés (ver `doc.historia-de-un-alma`); no hay transcripción en es.wikisource ni traducción española antigua de dominio público verificada. Pendiente: traducción española de dominio público.
- Traducción española antigua de las *Confesiones*: no encontrada; se incluye el original latino.
- **Revisadas y descartadas en es.wikisource (L7)**: *Guía espiritual* de Miguel de Molinos (doctrina condenada por la Iglesia, no es obra de espiritualidad católica recomendable); *Catecismo Astete* (ed. Valladolid, 1787; el OCR conserva errores sistemáticos: capitulares perdidas, guionado de fin de línea, «Espira Santo»; no cumple el nivel de limpieza); *Las moradas (1910)* y la BAE vol. 53 de santa Teresa (Camino de perfección, Fundaciones, etc.): solo existe el escaneo, sin páginas transcritas; no hay transcripciones de san Francisco de Sales, fray Luis de Granada, san Alfonso de Ligorio, Montfort, santa Catalina de Siena, san Juan de la Cruz (prosa), padres griegos ni Tomás de Aquino (solo himnos); los *Ejercicios espirituales* de san Ignacio no están (la página «Los ejercicios de S. Ignacio» es un poema burlesco ajeno).
- **Project Gutenberg (L7b, 26-11-2026)**: revisado el índice completo (894 libros en español). **No contiene** *Las moradas*, *Camino de perfección*, *Fundaciones*, obras en prosa de san Juan de la Cruz, *Imitación de Cristo*, *Introducción a la vida devota*, *Ejercicios espirituales*, *Guía de pecadores*, Ligorio ni *Confesiones* en español; lo único católico relevante es la obra de Balmes (incluida arriba; también están *Filosofía fundamental* de Balmes, *La perfecta casada*, ya incluida desde es.wikisource, y la biografía *San Ignacio de Loyola* de Benjamín Marcos, ebook #63359, no incluida por no verificar la fecha de fallecimiento del autor). Existen versiones inglesas PD en Gutenberg de varias de esas obras, pero se dejan como **pendientes** (no son español). Internet Archive, HathiTrust y la BDH solo ofrecen escaneos con OCR sin revisar (no se usan); la Biblioteca Virtual Miguel de Cervantes no se consultó por sus términos restrictivos.
- **Retiradas (L7b)**: *De los nombres de Cristo* (es.wikisource, oldid 1626622) y la *Autobiografía* de san Ignacio (oldid 1518097) se quitaron del catálogo, del código y de `content/packs`: las páginas (transcritas en 2008 por usuarios, sin edición ni escaneo declarados; la Autobiografía es una versión modernizada con párrafos numerados, probablemente de una edición moderna) no permiten verificar la edición de origen. Pendiente: transcribir desde una edición antigua identificada (p. ej. *Nombres de Cristo*, Salamanca 1583-85, o ed. de Merino 1804-16).
- **Portadas**: sin entrada propia en `tools/art/catalog.mjs` para los cinco paquetes nuevos (requiere elegir y descargar imágenes de Commons); usan la portada genérica `book:doc`. Pendiente.

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
| Torres Amat — resto | **Publicado parcial (NT, 15 libros)**. Faltan 2 Co, Ga, Ef, Flp, Col, 1-2 Ts, 1-2 Tm, Tt, Flm, Hb y los 46 libros del AT (con deuterocanónicos): en es.wikisource los tomos I-XII están como escaneo sin transcribir (nivel 0 / sin página) y solo hay unas decenas de páginas de Dt, Jos, Jue, Rut y Ct. No hay módulo SWORD/USFX ni dataset con licencia. Alternativa: OCR de Internet Archive (`torresamatbiblia`, ed. 1884; `bub_gb_*` de Google Books, ed. 1823-25) con reconocimiento propio (Tesseract spa) y revisión humana: la OCR de IA mezcla notas con el texto y tiene muchos errores (p. ej. Gn 1,1-5), por lo que no se ha publicado. |
| Scío — Antiguo Testamento | El único módulo digital encontrado (CrossWire) es solo del NT. |
| Douay-Rheims Challoner (1749-52) | No se encontró en formato estructurado. Candidatos: Project Gutenberg #8300 (HTML), Internet Archive. |
| `VerseMapping` (Vulgata ↔ hebrea) | Tabla creada, todavía sin datos. |

## Candidatas para fases siguientes (por verificar)
Referencias cruzadas de OpenBible.info (CC-BY), comentario Haydock (1859) y *Catena Aurea* (traducciones de dominio público), Catholic Encyclopedia (1913), Padres de la Iglesia de Schaff (ANF/NPNF), y para las lenguas originales OSHB (hebreo, CC-BY) y SBLGNT/MorphGNT. Los textos del Catecismo y de los documentos pontificios recientes tienen copyright de la Santa Sede (Libreria Editrice Vaticana): solo se enlazarán o citarán salvo que haya licencia.

## Oración de las Horas (`hours.es`, ola 2)
Estructura (salterio de cuatro semanas, tablas de lecturas): datos de hecho consultados el 26-11-2026 en catholic-resources.org (Fr. Felix Just, SJ) y en la tabla de Laudes y Vísperas de la Liturgy Office (Inglaterra y Gales); solo se usan las referencias, no sus textos. Himnos latinos: dominio público (Breviario Romano anterior a 1568). Colectas latinas: Misal/Breviario Romano anteriores a 1970, pendiente de cotejo. Traducciones, invocaciones y rótulos: Composición de Lux, CC BY-SA 4.0. Salmos, cánticos y lecturas: de la Biblia instalada. No contiene texto oficial CEM/CEE/LEV. Detalle en `docs/HORAS.md`.
