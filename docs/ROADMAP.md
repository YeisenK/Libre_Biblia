# Hoja de ruta

Estado: ✅ hecho · 🟡 parcial · ⏳ pendiente

## Fase 1 — Análisis y arquitectura ✅
Repositorio nuevo; arquitectura (`ARCHITECTURE.md`), modelo de datos (`DATA_MODEL.md`), fuentes (`SOURCES_AND_LICENSES.md`).

## Fase 2 — Infraestructura ✅
Monorepo, formato de paquetes y catálogo público, ingesta reproducible. (Una primera versión con API NestJS + Postgres y cuentas se sustituyó por la arquitectura sin servidor: ver ADR-009.)

## Fase 3 — Biblia 🟡
- ✅ Canon de 73 libros, referencias, ingesta reproducible.
- ✅ Gestor de descargas (repositorios públicos, sha256, importar desde archivo).
- ✅ Lector (capítulo, versículo, continuo), navegación, comparación paralela, búsqueda (palabras, frase, aproximada), marcadores, historial, continuar leyendo, ajustes tipográficos y temas, compartir texto/imagen, offline.
- 🟡 Traducciones: Vulgata Clementina y Douay-Rheims 1899 completas; Scío solo NT; **Torres Amat pendiente** (no existe fuente digital estructurada de dominio público; requiere OCR + revisión humana de las digitalizaciones).
- ⏳ App Android empaquetada con Capacitor (ver `apps/mobile`).

## Cultura hispánica 🟡
Paquetes de obras de dominio público desde Wikisource (épica, romancero, poesía y narrativa hispanoamericana). Pendiente: Popol Vuh (traducción de Ximénez), cancioneros populares.

## Fase 4 — Estudio ⏳
Referencias cruzadas (candidata: OpenBible.info cross references, CC-BY, versificación protestante ⇒ mapear), comentarios (Haydock 1859, Catena Aurea de santo Tomás — dominio público), diccionario (Catholic Encyclopedia 1913, dominio público), concordancia (sobre FTS existente + agrupación por lema), lenguas originales (fuentes candidatas: OSHB/WLC hebreo CC-BY, SBLGNT o Nestle 1904 + MorphGNT, léxicos de dominio público), Catecismo (texto con copyright de la Santa Sede: solo enlaces/referencias salvo licencia), patrística (Schaff NPNF/ANF, dominio público).

## Fase 5 — Biblioteca ⏳
Importación local de PDF/EPUB/DOCX/HTML/MD/TXT/RTF/JSON/XML en el propio dispositivo (pdf.js, epub.js, mammoth), OCR con Tesseract.js en Web Worker, troceado e indexación local, vínculos con pasajes.

## Fase 6 — Herramientas personales ⏳
Notas enlazadas, resaltados por color, etiquetas/carpetas, grafo de conocimiento, planes de lectura, estadísticas. Sincronización opcional entre dispositivos sin servidor propio (archivo, WebDAV o carpeta compartida).

## Fase 7 — Vida espiritual 🟡
- ✅ Calendario litúrgico del rito romano (`packages/shared/src/liturgy.ts`, puro, con tests): tiempo, semana, color, ciclos A/B/C y I/II, solemnidades, fiestas y memorias de la lista fija, fiestas móviles y traslados; opciones nacionales (Epifanía, Ascensión y Corpus en domingo).
- ✅ Sección «Hoy» (`/hoy`) y tarjeta en Inicio: cabecera litúrgica y versículo del ciclo temático instalado (paquete `daily`: contexto, reflexión, preguntas, oración, relacionadas), Profundizar, compartir como imagen/texto, favoritos, historial permanente por fecha (`/hoy?d=`), zona horaria opcional; favoritos e historial van en la copia de seguridad.
- ✅ Notificaciones locales: Android con `@capacitor/local-notifications` (próximos 7 días, sin alarmas exactas); web con la Notification API solo con la app abierta.
- ⏳ **Evangelio del día: falta una fuente verificable y con licencia de las referencias del leccionario.** Mientras tanto, `/hoy` muestra la cabecera litúrgica y el ciclo temático, con la nota «Las lecturas de la Misa aún no están disponibles». El modo «litúrgico» del versículo no se ofrece en Ajustes hasta entonces.
- ⏳ Conversión de versificación más allá de los Salmos (inglesa/hebrea/Vulgata): `apps/web/src/lib/versify.ts` es el único punto de conversión y debe conectarse al módulo de versificación (TVTMS) de `@bc/shared`.
- ⏳ Oraciones, diario espiritual.

## Fase 8 — IA ⏳
RAG local (índice léxico + embeddings en el dispositivo), proveedor y clave configurados por el usuario en el dispositivo o modelo local, citas verificables obligatorias, modo investigación.

## Fase 9 — Calidad y lanzamiento ⏳
Auditoría de seguridad, rendimiento, despliegue, iOS.
