# Hoja de ruta

Estado: ✅ hecho · 🟡 parcial · ⏳ pendiente

## Fase 1 — Análisis y arquitectura ✅
Repositorio nuevo; arquitectura (`ARCHITECTURE.md`), modelo de datos (`DATA_MODEL.md`), contrato de API (`API.md`), fuentes (`SOURCES_AND_LICENSES.md`).

## Fase 2 — Infraestructura ✅
Monorepo, Docker Compose (Postgres+pgvector, Redis, MinIO), Prisma + migración inicial, API NestJS con autenticación, usuarios y ajustes.

## Fase 3 — Biblia 🟡
- ✅ Canon de 73 libros, referencias, ingesta reproducible.
- ✅ Lector (capítulo, versículo, continuo), navegación, comparación paralela, búsqueda (palabras, frase, aproximada), marcadores, historial, continuar leyendo, ajustes tipográficos y temas, compartir texto/imagen, offline.
- 🟡 Traducciones: Vulgata Clementina y Douay-Rheims 1899 completas; Scío solo NT; **Torres Amat pendiente** (no existe fuente digital estructurada de dominio público; requiere OCR + revisión humana de las digitalizaciones).
- ⏳ App Android empaquetada con Capacitor (ver `apps/mobile`).

## Fase 4 — Estudio ⏳
Referencias cruzadas (candidata: OpenBible.info cross references, CC-BY, versificación protestante ⇒ mapear), comentarios (Haydock 1859, Catena Aurea de santo Tomás — dominio público), diccionario (Catholic Encyclopedia 1913, dominio público), concordancia (sobre FTS existente + agrupación por lema), lenguas originales (fuentes candidatas: OSHB/WLC hebreo CC-BY, SBLGNT o Nestle 1904 + MorphGNT, léxicos de dominio público), Catecismo (texto con copyright de la Santa Sede: solo enlaces/referencias salvo licencia), patrística (Schaff NPNF/ANF, dominio público).

## Fase 5 — Biblioteca ⏳
Importación PDF/EPUB/DOCX/HTML/MD/TXT/RTF/JSON/XML, OCR (Tesseract), cola BullMQ sobre Redis, almacenamiento en MinIO, troceado e indexación, vínculos con pasajes.

## Fase 6 — Herramientas personales ⏳
Notas enlazadas, resaltados por color, etiquetas/carpetas, grafo de conocimiento, planes de lectura, estadísticas, sincronización offline-first.

## Fase 7 — Vida espiritual ⏳
Versículo diario por ciclos temáticos/litúrgicos con historial, calendario litúrgico (cálculo propio del calendario romano general), oraciones, notificaciones (Web Push + notificaciones locales de Capacitor), diario espiritual.

## Fase 8 — IA ⏳
RAG híbrido (FTS + pgvector), proveedor configurable por variables de entorno, citas verificables obligatorias, modo investigación.

## Fase 9 — Calidad y lanzamiento ⏳
Auditoría de seguridad, rendimiento, despliegue, iOS.
