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

## Fase 7 — Vida espiritual ⏳
Versículo diario por ciclos temáticos/litúrgicos con historial, calendario litúrgico (cálculo propio del calendario romano general), oraciones, notificaciones locales (Capacitor Local Notifications; en web, Notification API con la app abierta), diario espiritual.

## Fase 8 — IA ⏳
RAG local (índice léxico + embeddings en el dispositivo), proveedor y clave configurados por el usuario en el dispositivo o modelo local, citas verificables obligatorias, modo investigación.

## Fase 9 — Calidad y lanzamiento ⏳
Auditoría de seguridad, rendimiento, despliegue, iOS.
