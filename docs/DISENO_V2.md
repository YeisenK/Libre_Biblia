# Diseño v2: Hallow para orar, BibleGateway para leer

El usuario vio la v0.4 en su S24 Ultra y la encontró **fea**: tipografía ornamental (Cormorant), marfil y oro por todas partes, chips de icono beige en cada fila, mayúsculas espaciadas en cada sección, tarjetas recargadas. Referencias pedidas: **Hallow** (oración) y **BibleGateway** (Biblia). Esta guía sustituye a la sección «Diseño» de `PLAN_ORACION.md`.

## Principios
1. **Contenido e imagen, no adornos.** Las superficies de oración viven de **arte sacro** (pintura española y europea de dominio público: Murillo, Zurbarán, Velázquez, El Greco, Ribera, Fra Angelico…), a pantalla completa o en tarjetas grandes con degradado inferior y texto blanco. Nada de iconos decorativos gigantes ni de chips de icono en cada fila.
2. **Una sola familia tipográfica de interfaz:** Inter. Títulos en Inter 700, tracking −0,02em (pantalla 28–32 px, sección 20 px, tarjeta 17 px). Se elimina Cormorant Garamond. El serif (Source Serif 4) se reserva al **texto que se lee o se reza** (Biblia, oraciones, reflexiones).
3. **Color neutro + un acento.**
   - Claro: fondo `#FFFFFF`, hundido `#F3F3F5`, líneas `#E7E7EB`, texto `#111114`, secundario `#6B6B76`.
   - Oscuro: fondo `#0D0D11`, superficie `#17171D`, líneas `#26262E`, texto `#F2F2F5`, secundario `#9A9AA6`.
   - Acento `#3B5BDB` en claro / `#8EA2FF` en oscuro (enlaces, selección, versículos, BibleGateway). El oro (`#C9A45C`) **solo** para progreso (rosario, novenas, rutinas) y nunca como relleno de botones o fondos.
   - Botón principal: relleno de texto (negro en claro, blanco en oscuro), pastilla, 48–52 px. Secundario: contorno fino o texto.
   - Sepia se conserva solo como tema de lectura.
4. **Oración inmersiva, oscura.** Orar, Rosario, Novena y la lectura de una oración usan siempre la estética oscura de Hallow (fondo casi negro, arte difuminado detrás del encabezado), sea cual sea el tema; el resto sigue el tema del usuario.
5. **Biblia como BibleGateway.** Página limpia, blanca en tema claro, columna de lectura de 65 ch, barra superior compacta con «Libro capítulo ▾» y «Versión ▾» (abreviatura) y botones de anterior/siguiente; números de versículo pequeños en el color de acento; títulos de capítulo sobrios en sans; sin cajas, sin sombras.
6. **Jerarquía sin ruido:** sin antetítulos en mayúsculas espaciadas salvo donde aporten (una vez por pantalla como máximo); subtítulos solo si informan; listas con separadores finos y sin icono por fila (icono monocromo de 20 px solo si identifica algo); esquinas 16 px en tarjetas, 12 px en controles; sombras casi nulas (en oscuro, ninguna).
7. **Navegación** inferior de 5 destinos con iconos monocromos de trazo; el activo en color de texto pleno y el resto en secundario. Sin pastillas ni fondos de color. Fondo sólido (`bg/95` con desenfoque) y línea superior fina.
8. **Español primero (ADR-018) y sin inglés a la vista:** por defecto solo se muestran Biblias en español (y la Vulgata latina como referencia). Las de otros idiomas siguen instaladas y disponibles, pero aparecen solo si el usuario activa «Mostrar Biblias en otros idiomas» en Ajustes; en Contenido van en una sección plegada «Otros idiomas». Si la versión actual del lector está oculta, la app pasa a la española.

## Arte
- `apps/web/public/art/<clave>.webp` (≈ 900 px de ancho, calidad ~70, ≤ 120 KB cada una) y `apps/web/src/lib/art.ts` con `artFor(clave)` → `{ src, title, artist, year, sourceUrl, license, focus? }` o `null`, más `ART_CREDITS` (se muestran en Fuentes y licencias).
- Claves: `mystery:<set>-<n>` (20), `set:<set>` (4), `novena:<id>` (28), `moment:morning|midday|afternoon|night`, `category:<id>` (las de `categories.json`), `home:default`. Un mismo cuadro puede servir a varias claves.
- Solo obras en dominio público (autor fallecido hace más de 100 años; reproducción fotográfica fiel de obra 2D = PD-Art en Wikimedia Commons). Se registra la URL de la página de Commons.

## Componentes (en `components/ui`)
Mantener las firmas existentes y restilizar; añadir:
- `ArtCard` (imagen, título, subtítulo, etiqueta, progreso; tamaños `hero` 16:10 a ancho completo, `tile` 4:5 en carrusel, `wide` 16:9), con degradado inferior y respaldo de color si no hay imagen.
- `ArtHeader` (cabecera de pantalla inmersiva con arte difuminado y título encima).
- `PrayerScreen` (contenedor oscuro inmersivo para superficies de oración).
