# Libre Biblia

Aplicación católica **libre** para leer y estudiar la Sagrada Escritura, rezar y conocer la cultura hispánica. Funciona en el **navegador** (PWA instalable) y en **Android** (Google Play), **sin cuentas, sin servidor, sin anuncios y sin rastreo**. Todo lo que guardas (marcadores, historial, ajustes) se queda en tu dispositivo.

El contenido no viene incluido: lo descargas, si quieres, desde **repositorios públicos**. El oficial es la carpeta [`content/`](content/) de este repositorio, pero puedes añadir otros.

## Qué puedes hacer
- **Leer la Biblia** en modo capítulo, versículo a versículo o continuo, con selector rápido de libro, capítulo y versículo, y campo «Ir a» que entiende `Rom 8,28`, `Mt 5,1-7,29` o `1 Cor 13`.
- **Comparar** de 2 a 4 traducciones en paralelo, alineadas por versículo.
- **Buscar** en tu propio dispositivo (por palabras, frase exacta o búsqueda aproximada) en la Biblia y en la biblioteca, con resultados agrupados por libro.
- **Biblioteca:** cultura hispánica, oración y clásicos espirituales. Cada obra muestra su autor, su época y la naturaleza de su autoridad, para que una obra literaria o un devocionario no se confunda con el Magisterio.
- **Marcadores, historial y «continuar leyendo».**
- **Personalizar la lectura:** temas claro, oscuro y sepia; tamaño de letra, interlineado y márgenes.
- **Compartir** versículos como texto o como imagen.
- **Funciona sin conexión** una vez descargado el contenido.
- **Copia de seguridad** en un archivo, para pasar tus datos a otro dispositivo.

## Contenido disponible en el repositorio oficial

Solo contenido de **dominio público** o con **licencia libre**, con su procedencia registrada en cada paquete (visible en la app, en *Fuentes y licencias*). El detalle completo está en [`docs/SOURCES_AND_LICENSES.md`](docs/SOURCES_AND_LICENSES.md).

### Biblias
| Traducción | Cobertura | Fuente | Licencia |
|---|---|---|---|
| **Vulgata Clementina** (latín, 1598) | 73 libros | [eBible.org · latVUC](https://ebible.org/Bible/details.php?id=latVUC) | Dominio público |
| **Douay-Rheims** (inglés, edición americana de 1899) | 73 libros | [eBible.org · engDRA](https://ebible.org/Bible/details.php?id=engDRA) | Dominio público |
| **Scío de San Miguel** (español, 2.ª ed. 1797) | Solo Nuevo Testamento | [CrossWire · SpaScioNT](https://crosswire.org/ftpmirror/pub/sword/raw/mods.d/spasciont.conf) | Dominio público |
| **Santa Biblia libre para el mundo** (español de España) | 73 libros · traducción libre moderna en borrador, sin aprobación eclesiástica | [eBible.org · spablm](https://ebible.org/Bible/details.php?id=spablm) | Dominio público |
| **Santa Biblia libre Latinoamericana** | 73 libros · traducción libre moderna en borrador, sin aprobación eclesiástica | [eBible.org · spabll](https://ebible.org/Bible/details.php?id=spabll) | Dominio público |

### Cultura hispánica
Las obras son de dominio público. La transcripción procede de [Wikisource en español](https://es.wikisource.org) y se publica bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es); cada paquete enlaza la revisión exacta de la página de origen.
- **Romancero viejo:** 31 romances anónimos, entre ellos *La doncella guerrera*, *La pérdida de Alhama*, *Abenámar*, *Gerineldo* y romances del Cid.
- **José Martí:** *Versos sencillos*.
- **Rubén Darío:** *Azul...*.
- **Sor Juana Inés de la Cruz:** 28 poemas, entre ellos *Hombres necios*.
- **José Hernández:** *Martín Fierro* (*La ida* y *La vuelta*).
- **Ricardo Palma:** *Tradiciones peruanas*, primera serie.
- **Inca Garcilaso de la Vega:** *Comentarios reales*, capítulos de la primera parte.

### Espiritualidad clásica
- **San Agustín:** *Confessiones*, en el latín original de la edición de Migne de 1841.
- **Santa Teresa de Jesús:** *Libro de la vida* y poesías.
- **San Juan de la Cruz:** *Cántico espiritual*, *Noche oscura*, *Llama de amor viva* y otros poemas.
- **Tomás de Kempis:** *Imitación de Cristo* (*De imitatione Christi*), los cuatro libros en el texto latino original de Wikisource (la edición es desconocida; no hay traducción española verificable).

### Oración y devoción
- **Devocionario católico:** oraciones fundamentales, la Misa, el Rosario, oraciones marianas, santos, Divina Misericordia, sacramentos, difuntos, bendiciones y oraciones en latín. Es una recopilación del autor del proyecto bajo CC BY-SA 4.0 y no sustituye a los libros litúrgicos oficiales.

### Pendiente
Torres Amat, el Antiguo Testamento de Scío, el *Cantar de mio Cid* en una edición de dominio público, el *Popol Vuh* en la traducción de Ximénez, *Historia de un alma* y *Las moradas*. En ningún caso existe todavía una transcripción libre y verificable, y **no se rellena ni se inventa texto**.

## Publicar tu propio repositorio de contenido
Basta con un `catalog.json` y paquetes `.json.gz` alojados en cualquier sitio estático con CORS (GitHub y jsDelivr, GitHub Pages, tu propio servidor). El formato está en [`content/README.md`](content/README.md) y los tipos en [`packages/shared/src/packs.ts`](packages/shared/src/packs.ts). En la app: *Contenido → Repositorios → Añadir*.

## Desarrollo

Requisitos: Node ≥ 22 y pnpm 9. Para Android, además: Android SDK (plataforma 36) y JDK 21.

```sh
pnpm install
pnpm --filter @bc/shared build
pnpm --filter @bc/web dev          # http://localhost:3000
pnpm test                          # pruebas de todo el monorepo
```

Probar con el contenido generado en local en vez del repositorio oficial:
```sh
pnpm content:serve                 # sirve content/ en http://localhost:5000
NEXT_PUBLIC_DEFAULT_CATALOG_URL=http://localhost:5000/catalog.json pnpm --filter @bc/web dev
```

Regenerar el contenido oficial (descarga las fuentes, las convierte, las valida y genera los paquetes de forma determinista):
```sh
pnpm ingest                                        # Biblias
pnpm --filter @bc/ingest run culture               # obras de Wikisource
pnpm --filter @bc/ingest run markdown <archivo.md> --id doc.<slug> ...   # documentos propios
```

Android y Google Play: ver [`docs/ANDROID.md`](docs/ANDROID.md) y [`store/RELEASE_CHECKLIST.md`](store/RELEASE_CHECKLIST.md).

### Estructura
```
apps/web        App (Next.js, exportación estática, PWA, IndexedDB)
apps/mobile     Envoltorio Android (Capacitor)
packages/shared Canon de 73 libros, referencias bíblicas, formato de paquetes
tools/ingest    Generación reproducible de los paquetes de contenido
content/        Repositorio oficial de contenido (catálogo + paquetes)
store/          Ficha, gráficos y lista de comprobación de Google Play
docs/           Arquitectura, modelo de datos, fuentes y hoja de ruta
```
Más detalle en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Privacidad
La app no recoge ni envía datos personales. Solo se conecta a los repositorios de contenido que tú elijas, para descargar paquetes. Ver [`PRIVACY.md`](PRIVACY.md).

## Licencia
- **Código:** [GNU Affero General Public License v3.0 o posterior](LICENSE) (AGPL-3.0-or-later). Puedes usarlo, estudiarlo, modificarlo y redistribuirlo; si publicas una versión modificada, incluso como servicio web, debes compartir su código bajo la misma licencia.
- **Contenido:** cada paquete conserva su propia licencia (dominio público o CC BY-SA 4.0, según el caso), indicada en el catálogo y en la app.
