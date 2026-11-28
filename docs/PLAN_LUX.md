# Plan Lux 0.5 → 1.0

La app pasa a llamarse **Lux** («Yo soy la luz del mundo», Jn 8,12). Este documento es el contrato común entre los agentes de esta fase. Lo planifica Opus; ejecutan Sonnet y Haiku. Todo en español.

## 1. Auditoría (estado al 25-11-2026, v0.4.0)

| Área | Estado |
|---|---|
| Arquitectura | Monorepo pnpm: `apps/web` (Next.js 15 export estático, React 19, Tailwind, Dexie, react-query), `apps/mobile` (Capacitor Android), `packages/shared`, `tools/ingest`, `content/` (paquetes .json.gz + `catalog.json` servidos por jsDelivr). Sin backend ni cuentas: todo local. |
| Biblia | Lector, comparar, buscar (MiniSearch), marcadores, historial, notas de versículo. Biblias PD: SCIO (Scío), TA (Torres Amat, parcial), SBLM, BLL (CC BY-SA), VULG, DRA. **Se descargan**; ninguna viene incluida. Fallo abierto: en Android los botones de la cabecera del lector no responden (en Chromium sí). |
| Oración | Devocionario incluido (`/packs/prayers.es.pack`): 20 categorías, 85 oraciones, 28 novenas, 20 misterios, 7 plantillas de rutina. Rosario guiado, rutinas guiadas (`/rezar`), favoritos, historial, recordatorios. |
| Voces | Paquetes de audio pregenerados con Juglar (Qwen3-TTS) para 4 voces, solo Rosario (72 clips, ~10 MB/voz). Se descargan. |
| Liturgia | `packages/shared/src/liturgy.ts`: calendario romano general completo con precedencias y móviles (sin calendarios propios salvo el Pilar). Lecturas de la Misa: solo citas (Evangelizo). |
| Biblioteca | Documentos del catálogo (14 obras + devocionario + Historia de un alma + Imitación). Sin importación de archivos. |
| Notificaciones | Locales (Capacitor LocalNotifications + web): versículo, lectura, oración, rutinas. |
| Arte | 163 cuadros PD/CC0 en `public/art` (`lib/art.ts`, `tools/art`). |
| iOS | No existe proyecto. |

## 2. Decisiones de licencia (no negociables)
- **Liturgia de las Horas:** los textos oficiales en español (CEM/CEE, LEV) tienen derechos. Lux ofrecerá la **estructura oficial** (salterio de 4 semanas, propio del tiempo, ordinario) con **textos de dominio público**: salmos y cánticos de una Biblia PD (Scío/Torres Amat), himnos latinos PD y traducciones PD, oraciones colecta solo si son PD o en latín. Se rotula «Oración de las Horas según la estructura oficial; textos de dominio público, no la traducción litúrgica aprobada». Se documenta cómo integrar el texto oficial si se obtiene licencia.
- **Catecismo y documentos pontificios:** © Libreria Editrice Vaticana. Lux incluye **índices, estructura, números de párrafo, resúmenes propios y enlaces a vatican.va**, no el texto íntegro. Documentos anteriores con traducción PD verificada sí pueden incluirse.
- **Diario de santa Faustina, Tratado de la verdadera devoción (trad. modernas), ediciones modernas:** solo si hay traducción PD verificable; si no, ficha con enlace.
- **Música:** solo grabaciones PD/CC0/CC BY (Musopen, Wikimedia Commons, Internet Archive con licencia clara). Se registra licencia de la obra y de la grabación.
- **Arte:** solo PD/CC0 de Commons o de museos con acceso abierto (Met, Rijksmuseum, AIC, NGA: CC0). Nada «solo uso no comercial».
- **Voces:** el audio generado con Juglar es nuestro; se distribuye como paquete. Los modelos no se distribuyen.
- **Nunca** inventar citas, atribuciones, fechas, horarios de misa ni rangos litúrgicos. Si algo no se verifica: `unverified: true` y aviso visible, o no se publica.

## 3. Identidad Lux
- Nombre visible «Lux» en web, Android (strings.xml, appName), manifiesto, títulos, splash, documentación.
- **No cambia** `appId` (`io.github.yeisenk.librebiblia`), la base de datos IndexedDB (`bc-local`), las claves de localStorage (`bc.*`) ni la URL del repositorio/CDN: cambiarlos rompería las instalaciones y los datos existentes. Se documenta en `docs/adr/` como ADR-019.
- Logotipo: monograma/luz sobria (llama o estrella de luz con cruz sutil), SVG propio; icono adaptativo Android y PWA.

## 4. Contratos comunes (ya en el código)
- `packages/shared/src/prayers.ts`: `PrayerNature` ampliado con `saint`, `contemporary`, `original` (composición de Lux, siempre rotulada).
- `packages/shared/src/saints.ts`: `Saint`, `SaintsPack` (paquete `saints.es`).
- `apps/web/src/lib/db.ts` **versión 4** (no crear otra versión sin coordinar): `importedBooks`, `bookFiles`, `annotations`, `userCollections`, `diaryEntries`, `luxFavorites`.
- Claves estables de contenido: `prayer:<id>`, `novena:<id>`, `litany:<id>` (las letanías son `Prayer` con categoría `letanias`), `saint:<id>`, `book:<id>`, `art:<id>`, `music:<id>`, `ccc:<n>`, `doc:<id>`, `hour:<fecha>:<hora>`.
- Paquetes incluidos en la app: patrón `ensureBundledPrayers` (`lib/prayers/catalog.ts`), archivos `.pack` en `apps/web/public/packs/` (Android renombra `.gz`).

## 5. Fases y responsables

### Ola 1 (en paralelo; cada agente solo toca sus archivos)
| Agente | Modelo | Alcance | Archivos propios |
|---|---|---|---|
| **L1 Identidad y plataforma** | Sonnet | Marca Lux, logo, iconos, splash, navegación, «Mi espacio», ADR-019, fallo de la cabecera del lector en Android, proyecto iOS (Capacitor) preparado y documentado, PWA. | `AppShell`, `layout.tsx`, `manifest`, `public/icons`, `apps/mobile/**`, `scripts/gen-icons`, `docs/IOS.md`, `docs/ANDROID.md`, README |
| **L2 Calendario y temporadas** | Sonnet | Calendario propio de México (y estructura para otros), pantalla `/calendario`, «Santo del día» (componente), temporadas espirituales (Adviento, Navidad, Cuaresma, Semana Santa, Pascua) y notificaciones litúrgicas configurables. Tipo de paquete `saints`. | `packages/shared/src/liturgy*.ts`, `lib/calendar/**`, `lib/seasons/**`, `app/calendario`, `app/santo`, `components/calendar/**`, `components/saints/**`, `lib/notifications/**`, paquetes `saints` en `packs.ts`/`install.ts` |
| **L3 Santoral** | Sonnet | Datos de santos (`tools/ingest/sources/saints/*.json`) del Calendario Romano General + propio de México, con biografías con fuentes; generador del paquete `saints.es`. | `tools/ingest/sources/saints/**`, `tools/ingest/src/saints.ts` |
| **L4 Oraciones, letanías y novenas** | Sonnet | Categorías de vida cotidiana (trabajo, estudio, deporte, familia, vida personal, circunstancias), letanías (Loreto, Sagrado Corazón, Santo Nombre, Preciosa Sangre, San José, Santos, Humildad, otras con fuente), novenas por necesidad con criterios doctrinales, colecciones personales, compartir. | `tools/ingest/sources/prayers/**`, `components/prayer/**` (colecciones) |
| **L5 Recursos incluidos** | Sonnet | Biblias en español incluidas en la app (primera instalación sin red), voz Fraile incluida y predeterminada, pantalla de primer uso que explica qué viene incluido y qué se descarga. | `lib/packs/bundled.ts`, `public/packs/*`, `components/onboarding/**`, `lib/audio/**` (solo valores por defecto) |
| **L6 Biblioteca personal** | Sonnet | Importar EPUB, PDF, TXT, Markdown (y HTML/FB2 si es razonable); ficha y metadatos editables; lector con índice, marcadores, subrayados, notas, búsqueda, última posición; PDF con páginas y zoom; gestión de espacio; copia de seguridad de anotaciones. | `lib/library/**`, `components/library/**`, `app/libro`, `app/importar` |
| **L7 Catálogo de obras** | Sonnet | Nuevas obras PD en español desde Wikisource (Teresa: Moradas, Camino; Juan de la Cruz: Subida, Noche, Cántico; Francisco de Sales: Introducción a la vida devota; Ignacio: Ejercicios; Luis de Granada; Agustín; Kempis en español si hay edición fiable; etc.). | `tools/ingest/src/culture/works.ts` (nuevas entradas), `content/packs/doc.*` |
| **L8 Integridad** | Haiku | Validador de datos (duplicados, referencias rotas, fechas imposibles, oraciones `original` sin rotular, santos sin fuentes) como orden `pnpm --filter @bc/ingest validate-content` + prueba en CI. | `tools/ingest/src/integrity.ts`, `tools/ingest/test/integrity.test.ts` |

Integración en Inicio (Santo del día, temporada, obra del día…) la hace **L1** al final de la ola usando los componentes exportados por los demás; si aún no existen, deja el hueco preparado.

### Ola 2: Liturgia, formación y vida espiritual
Oración de las Horas (con modo paso a paso como el Rosario y audio Fraile), Formación (Catecismo como índice enlazado, documentos con fichas, áreas de estudio, itinerarios), examen de conciencia (sin guardar nada por defecto), guía de confesión, adoración eucarística/Hora Santa, Vía Crucis/Vía Lucis, diario espiritual, generación de audio Fraile para oraciones nuevas (GPU: **un solo proceso de Qwen a la vez**).

### Ola 3: Cultura y descubrimiento
Galería (arte sacro, hispano, novohispano, universal; obra del día; contemplación), música sacra (grabaciones con licencia libre), historia de la Iglesia (cronología), diccionario, latín eclesiástico, enciclopedia de santos ampliada, patrística y comentarios vinculados a la Biblia (Catena Aurea, Padres PD), mapa de santuarios (OpenStreetMap; sin horarios inventados), conexiones entre módulos y búsqueda global.

## 6. Reglas para todos los agentes
- No hacer commit ni push. No tocar `~/Juglar`. No correr dos modelos Qwen a la vez.
- No usar `pkill -f`/`pgrep -f` con patrones que coincidan con la propia orden; `sleep` en primer plano está bloqueado (usar segundo plano).
- Antes de editar un archivo compartido (`settings.ts`, `db.ts`, `packs.ts`, `catalog.json`, `index.ts`), releerlo: otros agentes trabajan a la vez. Cambios mínimos y localizados.
- Pruebas: `pnpm -r --if-present typecheck`, `cd apps/web && npx vitest run`, `cd tools/ingest && npx vitest run` en verde. Añadir pruebas propias.
- No dar por terminada una función que solo tiene interfaz. Informe final: hecho, probado, pendiente y qué falta (licencias, servicios, cuentas).

## 7. Recursos incluidos (L5)

La app funciona sin red desde el primer uso. Mecanismo: `apps/web/scripts/sync-bundled-packs.mjs` (se ejecuta en `dev` y `build`) copia los paquetes de `content/packs/` a `public/packs/<id>.pack` (extensión `.pack`: Android renombra los `.gz`), comprueba su sha256 contra `content/catalog.json` y genera `public/packs/bundled.json`. Al abrir la app, `lib/packs/bundled.ts` instala en segundo plano, de uno en uno y con estado observable (`useBundledStatus`), solo lo que falta o cuya versión incluida es más nueva, verificando sha256, e indexa las Biblias (MiniSearch) para buscar sin red. Lo que el usuario quita a propósito no se reinstala (`bc.bundled.dismissed`). El devocionario sigue con `ensureBundledPrayers`. Para actualizar un recurso incluido basta regenerar el paquete (nueva `version` en el catálogo) y recompilar: los usuarios lo reciben con la siguiente versión de la app.

| Recurso | Descarga comprimida | Decisión |
|---|---|---|
| `bible.BLL` Biblia libre Latinoamericana | 1,57 MB | **Incluida y predeterminada.** Única Biblia completa en español (73 libros) que no obliga a elegir entre dos borradores casi idénticos; castellano latinoamericano (público principal) y es el texto de los pasajes del Rosario. **CC: dominio público (eBible.org), pero es un borrador de traducción moderna sin aprobación eclesiástica**: se indica en la ficha y en Fuentes. |
| `bible.SCIO` Scío de San Miguel | 0,33 MB | **Incluida.** Traducción católica clásica (1797, aprobada en su época) de la Vulgata; coste mínimo. **Solo Nuevo Testamento** (el módulo no trae el Antiguo): por eso no puede ser la predeterminada. |
| `bible.VULG` Vulgata Clementina | 1,46 MB | **Incluida.** Texto oficial histórico de la Iglesia latina; imprescindible para el latín eclesiástico y como referencia. Dominio público. |
| `bible.TA` Torres Amat (parcial) | 0,31 MB | Descargable, **no incluida ni predeterminada**: traducción católica clásica de la Vulgata (1823-1836, licencias eclesiásticas de su época) pero solo 15 de 27 libros del NT (ver SOURCES_AND_LICENSES). Aportaría poco sobre Scío NT incluida; cuando exista el AT corregido pasará a incluida y `defaultVersion = 'TA'`. |
| `bible.SBLM` Biblia libre para el mundo | 1,52 MB | Descargable. Casi gemela de BLL (español de España); incluirla duplicaría 1,5 MB sin aportar cobertura. |
| `bible.DRA` Douay-Rheims | 1,47 MB | Descargable (inglés; fuera del público objetivo). |
| `audio.oraciones.fraile` voz Fraile | 10,41 MB | **Incluida y predeterminada** (`prayerVoice = 'audio.oraciones.fraile'`). Otras voces (Helena, Micael, Narrador: ~10,5 MB cada una) descargables. |

Total incluido: 13,77 MB de paquetes (3,36 MB de Biblias + 10,41 MB de voz) además del devocionario (0,14 MB). Instalada, la voz ocupa más en IndexedDB (audio decodificado en blobs). Las Biblias se instalan al abrir, no al compilar: el APK lleva los paquetes comprimidos una vez. La versión por defecto del lector es `BLL`; si no estuviera instalada, el lector usa la primera en español. Los ajustes ya guardados por usuarios existentes no cambian (quien tenía «sin voz» sigue sin voz).

Primer uso: hoja de bienvenida (`components/onboarding/Welcome.tsx`, una sola vez, `localStorage bc.onboarding.v1`) con lo incluido, el progreso de la instalación y qué se descarga después. Prueba: `pnpm build`, `PORT=4402 node scripts/serve-out.mjs` y `npx playwright test -c playwright.offline.config.ts` (apps/web).

