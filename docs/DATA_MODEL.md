# Modelo de datos

La app no tiene base de datos de servidor. Hay dos capas:

## 1. Formato de contenido (paquetes)
Definido en `packages/shared/src/packs.ts`:
- `Catalog` — `catalog.json` de un repositorio: `format`, `name`, `packs: CatalogEntry[]`.
- `CatalogEntry` — `id`, `kind` (`bible` | `document`), `version`, `title`, `language`, `url`, `bytes`, `sha256`, `authority`, `collection`, `source`.
- `BiblePack` — `meta` (código, edición, versificación, completitud, fuente) + `books[osis][capítulo] = [[versículo, texto]]`.
- `DocumentPack` — `meta` (título, género, autor, región, época, edición, colección, fuente) + `sections[]` (`path` jerárquico, `depth`, `title`, `text`).
- `authority`: `scripture | magisterium | patristic | theological_opinion | academic_hypothesis | literary | personal`. La UI nunca presenta una opinión como doctrina.

## 2. Base local del dispositivo (IndexedDB con Dexie)
Definida en `apps/web/src/lib/db.ts`:
| Tabla | Contenido |
|---|---|
| `repositories` | URLs de catálogos (oficial por defecto + los que añada el usuario) |
| `installedPacks` | metadatos del `CatalogEntry` instalado + fecha |
| `bibleVerses` | versículos de cada Biblia instalada, clave `[packId+book+chapter+verse]` |
| `documents` / `documentSections` | obras instaladas (cultura hispánica, en el futuro libros propios) |
| `searchIndexes` | índice MiniSearch serializado por paquete |
| `bookmarks`, `history`, `readingPosition`, `settings` | datos personales |

Las copias de seguridad exportan solo los datos personales; los paquetes se vuelven a descargar.

## Fases futuras (diseño)
Notas enlazadas (`notes`, `noteLinks`), resaltados (`highlights`), planes de lectura (`readingPlans`, `planProgress`), versículo diario (`dailyVerses`), referencias cruzadas y comentarios como nuevos tipos de paquete (`kind: 'crossrefs' | 'commentary' | 'dictionary'`) anclados a `BiblePassage` (libro + rango en versificación canónica).
