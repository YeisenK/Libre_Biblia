# Contrato de la API REST (v1)

Base: `http://localhost:4000/api/v1`. JSON. Tipos en `packages/shared/src/types.ts`.
Swagger en `/api/docs`. Errores: `{ statusCode, message, error }` (formato NestJS).

## Autenticación
| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password (≥10), displayName? }` | `AuthResponseDto` (201) |
| POST | `/auth/login` | `{ email, password }` | `AuthResponseDto` |
| POST | `/auth/refresh` | web: cookie `bc_rt`; nativo: `{ refreshToken }` | `AuthResponseDto` (rota el refresh) |
| POST | `/auth/logout` | igual que refresh | 204 |

- Access token JWT (15 min) en `Authorization: Bearer`.
- Refresh token opaco (30 días), guardado como sha256, rotación por familia (reuso ⇒ revoca familia).
- Web: cookie `bc_rt` httpOnly, `SameSite=Lax`, `Secure` en producción, `Path=/api/v1/auth`.
- Nativo (Capacitor): cabecera `X-Client: native` ⇒ `refreshToken` en el cuerpo de la respuesta, sin cookie.

## Usuario (requiere auth)
| GET | `/users/me` | → `UserDto` |
| PATCH | `/users/me` | `{ displayName? }` → `UserDto` |
| DELETE | `/users/me` | `{ password }` → 204 (borra todos sus datos) |
| GET | `/users/me/export` | → JSON con todos sus datos |
| GET/PUT | `/users/me/settings` | `UserSettingsDto` |

## Biblia (pública)
| GET | `/bible/versions` | → `BibleVersionDto[]` |
| GET | `/bible/versions/:code/books` | → `BookDto[]` (solo libros presentes en esa versión; `name`/`abbr` en español) |
| GET | `/bible/versions/:code/chapters/:book/:chapter` | → `ChapterDto` (404 si no existe) |
| GET | `/bible/parallel/:book/:chapter?versions=VULG,DRA` | → `ParallelChapterDto` (2–4 versiones) |
| GET | `/bible/passage?ref=Jn%203,16-18&version=DRA` | → `PassageDto` |
| GET | `/bible/versions/:code/offline` | → `OfflineBibleDto` (con `ETag`, `Cache-Control`) |

## Búsqueda (pública)
`GET /search?q=&versions=VULG,DRA&mode=words|exact|fuzzy&testament=OT|NT&book=John&page=1&pageSize=25` → `SearchResultDto`
- Si `q` es una referencia válida (`parseReference`), devuelve `reference` y `hits: []`.
- `words`: `websearch_to_tsquery(ts_config, q)`; `exact`: frase (`phraseto_tsquery` + `ILIKE`); `fuzzy`: `pg_trgm` (`word_similarity`).
- `snippet` con `<mark>`; el texto se escapa antes de insertar marcas (`ts_headline` sobre texto escapado).

## Lectura personal (requiere auth)
| GET/POST | `/bookmarks` | `{ version?, book, chapter, verse?, label? }` → `BookmarkDto` |
| DELETE | `/bookmarks/:id` | 204 |
| POST | `/reading/history` | `{ version, book, chapter }` → 204 |
| GET | `/reading/history?limit=50` | → `{ version, book, chapter, readAt }[]` |
| GET/PUT | `/reading/position` | `ReadingPositionDto` |

## Salud
`GET /health` → `{ status: 'ok', db: 'ok' }`
