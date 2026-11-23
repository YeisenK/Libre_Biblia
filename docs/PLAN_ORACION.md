# Plan: rediseño integral y vida de oración (v0.4)

Contrato común para todo el trabajo de esta etapa. Se construye **sobre la app existente** (Next.js export + Capacitor, Dexie, paquetes de contenido). No se reescribe nada que funcione.

## Decisiones

| # | Decisión | Motivo |
|---|---|---|
| ADR-014 | Las oraciones, novenas y el Rosario son un paquete nuevo `kind: 'prayers'` (`PrayersPack`, en `packages/shared/src/prayers.ts`). El paquete oficial `prayers.es` es contenido propio del proyecto (CC BY-SA 4.0) y **va incluido en la app** (`apps/web/public/packs/prayers.es.json.gz`), instalado al abrirla (`ensureBundledPrayers`). También se publica en `content/` para que otros repositorios lo amplíen o corrijan. | El Rosario y las oraciones deben funcionar sin descargar nada. ADR-010 se mantiene para textos de terceros. |
| ADR-015 | Las voces de Juglar (Qwen3-TTS, GPU) **no corren en el móvil**. Los textos de oración son fijos, así que se pregeneran en el PC con la línea de órdenes de Juglar (`md2audio`) y se publican como paquetes `kind: 'audio'` (`AudioPack`, un paquete por voz, clips Opus en base64). Juglar no se modifica. | Reutiliza sus voces y ajustes tal cual; en el teléfono solo se reproduce. |
| ADR-016 | Cada texto declara su naturaleza (`PrayerNature`: litúrgica, oración de la Iglesia, devoción privada, piedad popular) y se muestra siempre. | Fidelidad: no presentar una devoción privada como obligación ni confundirla con la liturgia. |
| ADR-017 | Datos de oración personales (rutinas, registro diario, favoritos, novenas, rosarios, historial) en Dexie v3 y en la copia de seguridad. | Mismo modelo local que el resto de la app (ADR-013). |
| ADR-018 | Español primero: las Biblias en español se ordenan primero y son la predeterminada si hay alguna instalada. Las demás lenguas siguen disponibles. | Identidad hispana. |

## Base ya hecha (no reescribir; ampliar solo si hace falta y avisar)
- Tipos: `packages/shared/src/prayers.ts` (Prayer, Novena, Mystery, RosaryData, RoutineTemplate, AudioPack, `mysterySetForWeekday`, etiquetas de naturaleza y grupos). `assertPack` acepta `prayers` y `audio`.
- Dexie v3 (`apps/web/src/lib/db.ts`): `prayerPacks`, `audioPacks`, `audioClips`, `routines`, `routineLog`, `prayerFavorites`, `novenaProgress`, `rosarySessions`, `prayerHistory`. Instalación de `prayers`/`audio` en `lib/packs/install.ts`.
- Ajustes nuevos en `lib/settings.ts`: `rosaryMode`, `rosaryReflections`, `rosaryPassages`, `rosaryExtras`, `prayerVariants`, `prayerVoice`, `rosaryAutoplay`, `prayerFontScale` (variable CSS `--prayer-scale`), `prayerShowLatin`.
- Catálogo: `lib/prayers/catalog.ts` (`loadCatalog`, `buildCatalog`, `prayerText`, `itemTitle`, `itemHref`, `mysteriesOf`, `ensureBundledPrayers`) y `hooks/usePrayers.ts` (`usePrayerCatalog`).
- Diseño: tokens en `app/globals.css` (`gold`, `gold-soft`, `raised`, `ok`, `night`, fondos `bg-moment-*` y `bg-sacred`, clases `eyebrow`, `card-soft`, `tap`, `prayer-text`), fuente `font-display` (Cormorant Garamond), sombras `shadow-soft|lift|glow`, animación `animate-rise-in`.
- Componentes: `components/ui/index.tsx` (ScreenHeader, Section, HeroCard, TileCard, ListRow, ListGroup, Chip, Rail, ProgressBar, ProgressRing, EmptyState, Segmented, Toggle, NatureBadge, TextSizeControl, IconButton, momentOf, MOMENT_LABEL, MOMENT_GREETING) e iconos `components/icons/Sacred.tsx` (`SacredIcon name=…`).

## Mapa de navegación
Barra inferior (móvil) y lateral (escritorio): **Inicio** `/` · **Orar** `/orar/` · **Biblia** `/leer/` · **Biblioteca** `/biblioteca/` · **Más** `/mas/`.
- `/` Inicio según el momento del día: saludo y día litúrgico, `TodayAgenda`, `RosaryCard`, Evangelio/versículo del día (`TodayCard`), `ContinueNovena`, continuar leyendo, `FavoritePrayers`.
- `/orar/` centro de oración: agenda, Rosario, novenas en curso, categorías, buscador de oraciones, favoritas, rutinas.
- `/oraciones/?cat=<id>` lista por categoría · `/oracion/?id=<id>` lectura de una oración.
- `/novenas/` catálogo · `/novena/?id=<id>[&day=N]` introducción, día y progreso.
- `/rutinas/` mis rutinas · `/rutina/?id=<id>` edición (añadir, quitar, reordenar, recordatorio).
- `/rosario/` introducción y rezo guiado · `/rosario/historial/`.
- `/mas/` marcadores, historial, buscar, comparar, contenido, ajustes, fuentes y licencias.
- Rutas existentes (`/hoy/`, `/leer/`, `/comparar/`, `/buscar/`, `/marcadores/`, `/ajustes/`, `/descargas/`, `/fuentes/`, `/documento/`) se conservan con el estilo nuevo.

## Puntos de enlace entre módulos (stubs ya creados)
| Componente | Dueño | Uso |
|---|---|---|
| `components/prayer/TodayAgenda.tsx` | C | Inicio, Orar |
| `components/prayer/ContinueNovena.tsx` | C | Inicio, Orar |
| `components/prayer/FavoritePrayers.tsx` | C | Inicio, Orar |
| `components/prayer/PrayerSettings.tsx` | C | Ajustes |
| `components/rosary/RosaryCard.tsx` | B | Inicio, Orar |
| `components/audio/PrayerAudio.tsx` (`PrayerAudioButton`) | E | Rosario, lectura de oraciones |

## Claves estables
- Oraciones: `padre-nuestro`, `ave-maria`, `gloria`, `credo-apostoles`, `credo-niceno`, `senal-de-la-cruz`, `salve`, `oracion-fatima`, `ofrecimiento-del-dia`, `acto-de-fe`, `acto-de-esperanza`, `acto-de-caridad`, `angelus`, `regina-coeli`, `acto-de-contricion`, `angel-de-la-guarda`, `san-miguel-arcangel`, `bendicion-mesa`, `accion-de-gracias-comida`, `ven-espiritu-santo`, `bajo-tu-amparo`, `acordaos`, `magnificat`, `coronilla-divina-misericordia`, `examen-de-conciencia`, `letania-lauretana`, `oracion-final-rosario`, `oracion-de-la-noche`, `nunc-dimittis`, `te-deum`, `requiem-aeternam`, … (los autores de contenido amplían la lista; los ids no cambian una vez publicados).
- Elementos de rutina: `prayer:<id>`, `novena:<id>`, `rosary`, `gospel`, `verse`.
- Audio: `prayer:<id>`, `mystery:<set>-<n>:announce`, `mystery:<set>-<n>:reflection`, `mystery:<set>-<n>:passage`, `rosary:cue:<id>`.

## Reparto
- **A1 (contenido: oraciones y Rosario)** — `tools/ingest/sources/prayers/` (categorías, oraciones, `rosary.json`, `routines.json`), `tools/ingest/src/prayers.ts` (construcción + validación), salida `content/packs/prayers.es.json.gz`, catálogo y copia en `apps/web/public/packs/`.
- **A2 (contenido: novenas)** — `tools/ingest/sources/prayers/novenas/*.json`.
- **B (Santo Rosario)** — `lib/rosary/*`, `components/rosary/*`, `app/rosario/**`.
- **C (módulo de oraciones)** — `lib/prayers/*` (salvo `catalog.ts`, ampliable), `components/prayer/*`, `app/orar|oraciones|oracion|novenas|novena|rutinas|rutina/**`, recordatorios en `lib/notifications/*`, copia de seguridad (`lib/backup.ts`, `lib/personal.ts` → `clearAll`), búsqueda de oraciones.
- **D (rediseño general)** — `components/AppShell.tsx`, `app/page.tsx`, `app/mas/`, estilo del resto de pantallas y componentes existentes, prioridad del español (`lib/queries.ts`, `hooks/useBible.ts`, selectores, Contenido).
- **E (voces de Juglar)** — `tools/audio/` (generación con `md2audio`, paquetes `audio.*`), `lib/audio/*`, `components/audio/*`.
- **F (Imitación de Cristo)** — ingesta de una edición española de dominio público con la canalización `culture` existente.

## Reglas para todos
- Español en textos, comentarios y nombres de interfaz. Convenciones del proyecto (Tailwind con tokens, `'use client'`, react-query, Dexie, Markdown seguro con `components/Markdown.tsx`).
- No tocar archivos de otro dueño; si hace falta un cambio en la base, hacerlo aditivo y anotarlo en el informe.
- Sin `git commit`, sin `next build`/`next dev` (lo hace el coordinador). Sí `npx tsc --noEmit` en `apps/web` y `vitest` de lo propio.
- Accesibilidad: objetivos táctiles ≥ 44 px, foco visible, `prefers-reduced-motion`, contraste en claro/oscuro/sepia, sin desbordamiento horizontal en 360 px.
- Fidelidad (ver `docs/` y ADR-016): textos aprobados y tradicionales; variantes legítimas identificadas; sin atribuciones dudosas; sin inventar indulgencias, promesas ni obligaciones; fuentes citadas.
