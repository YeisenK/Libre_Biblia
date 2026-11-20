# Modelo de datos

Fuente de verdad del implementado: `packages/db/prisma/schema.prisma`. Este documento añade el diseño de las fases siguientes para que las migraciones futuras sean aditivas.

## Principios
1. **Procedencia obligatoria**: todo contenido de terceros (`BibleVersion`, `Commentary`, `Document`, `PatristicWork`, `MagisterialDocument`…) tiene `sourceId → Source` (licencia literal, URL, checksum, fecha).
2. **Autoridad explícita**: el contenido de estudio lleva `authority` (`scripture | magisterium | patristic | theological-opinion | academic-hypothesis | personal`) para que la UI y la IA nunca presenten una opinión como doctrina.
3. **Anclaje bíblico uniforme**: cualquier entidad que se vincula a la Biblia usa `BiblePassage` (libro + cap/vers inicial y final en versificación canónica), lo que permite consultar “todo lo que habla de Rom 8” con un índice por rango.
4. **Datos de usuario aislados** por `userId` con borrado en cascada.

## Implementado (fases 1–3)
| Entidad | Claves e índices relevantes |
|---|---|
| `Source` | `key` único |
| `BibleBook` | `id` = orden canónico 1..73, `osis` único |
| `BibleVersion` | `code` único; `versification`, `tsConfig`, `completeness` |
| `BibleChapter` | único (versión, libro, capítulo); `verseCount` |
| `BibleVerse` | único (versión, libro, cap, vers); GIN `tsv`; GIN trigram `lower(text)` |
| `VerseMapping` | único (esquema origen, destino, clave) |
| `User`, `RefreshToken` (hash único, `familyId`), `UserSettings` | |
| `Bookmark` | único (usuario, libro, cap, vers) |
| `ReadingHistory` | índice (usuario, fecha desc) |
| `ReadingPosition` | uno por usuario |

## Diseñado (fases 4–8)
```
BiblePassage(id, bookId, chapterStart, verseStart?, chapterEnd, verseEnd?, scheme)
  índice (bookId, chapterStart, chapterEnd)

CrossReference(id, from → BiblePassage, to → BiblePassage,
               kind: quotation|allusion|prophecy-fulfillment|parallel|doctrinal|typology,
               sourceId, votes?)

Author(id, name, era, kind: father|doctor|scholastic|modern|..., born?, died?, isSaint, isDoctor)
Commentary(id, title, authorId, sourceId, authority, language)
CommentaryEntry(id, commentaryId, passageId, body, order)

DictionaryEntry(id, headword, kind: person|place|object|concept|event|historical|liturgical,
                body, sourceId) + DictionaryEntryPassage
Lemma(id, language: hbo|arc|grc, lemma, translit, strong?, gloss, sourceId)
OriginalToken(id, versionId, bookId, chapter, verse, position, surface, lemmaId, morph)

Document(id, ownerId?, title, kind: book|encyclical|council|catechism|patristic|user-upload,
         authority, language, publishedAt?, sourceId?, fileKey?, status, checksum)
DocumentSection(id, documentId, parentId?, title, order, path)
DocumentChunk(id, sectionId, text, tokenCount, tsv, embedding vector(N))
DocumentLink(id, documentId|sectionId, passageId?, topicId?, authorId?, targetDocumentId?)
Collection, Category, Tag (+ tablas puente), Citation(id, fromChunkId, raw, parsedPassageId?)

Note(id, userId, title, body(md), anchors → passage/document/section), NoteLink(fromId, toId)
Highlight(id, userId, color, anchor: versión+versículos | documento+offsets)
ReadingPlan, ReadingPlanDay, ReadingPlanEnrollment, ReadingProgress
DailyVerse(id, date, passageId, cycle, reflection?, prayer?, sourceId)  único (date, cycle)
LiturgicalDay(date, season, rank, celebration, color, readings[] → passages)
Prayer(id, title, text, sourceId, category)
NotificationPreference(userId, kind, time, timezone, enabled)
AIConversation(id, userId, scope), AIMessage(id, conversationId, role, content, citations jsonb)
```

## Migraciones
- Prisma Migrate; SQL manual para lo que Prisma no modela (trigger `tsv`, índices trigram, futuros índices HNSW de pgvector).
- Cada fase añade tablas; no se renombran columnas existentes sin migración en dos pasos.
