# Fuentes y licencias del contenido

El **código** de Libre Biblia se distribuye bajo **GNU AGPL-3.0-or-later** (ver `LICENSE`).
El **contenido** (textos bíblicos y, en el futuro, comentarios y documentos) tiene su propia licencia, registrada en la tabla `Source` y visible en la app (Ajustes → Fuentes y licencias).

Regla del proyecto: solo se incluye contenido de dominio público o con licencia abierta verificada. Nunca se rellena ni se reconstruye texto que falte en una fuente.

## Traducciones bíblicas incluidas

| Código | Traducción | Edición | Cobertura | Licencia declarada | Procedencia | Descarga |
|---|---|---|---|---|---|---|
| `VULG` | Vulgata Clementina (latín) | Clementina 1598, con la Glossa Ordinaria (ed. Migne 1880), según eBible.org | 73 libros, 1334 caps., 35 809 vers. | Public Domain | [eBible.org · latVUC](https://ebible.org/Bible/details.php?id=latVUC) | `https://eBible.org/Scriptures/latVUC_usfm.zip` |
| `DRA` | Douay-Rheims (inglés) | **Edición americana de 1899** (no es la revisión de Challoner de 1752) | 73 libros, 1334 caps., 35 811 vers. | Public Domain | [eBible.org · engDRA](https://ebible.org/Bible/details.php?id=engDRA) | `https://eBible.org/Scriptures/engDRA_usfm.zip` |
| `SCIO` | Felipe Scío de San Miguel, *La Biblia Vulgata Latina traducida en Español* | 2.ª ed., 1797 | **Solo Nuevo Testamento**: 27 libros, 260 caps., 7957 vers. | Public Domain (`DistributionLicense` del módulo) | [CrossWire · SpaScioNT](https://crosswire.org/ftpmirror/pub/sword/raw/mods.d/spasciont.conf) | `https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/SpaScioNT.zip` |

Los sha256 de cada archivo descargado y la fecha de obtención se guardan en `Source.checksum` / `Source.retrievedAt` y en `tools/ingest/raw/<CODE>/manifest.json`. Para reproducir la carga: `pnpm ingest`.

### Notas de edición
- **Versificación**: las tres siguen la numeración de la Vulgata (Salmos según la LXX, Ester con 16 capítulos, Daniel con 14, Baruc 6 = Carta de Jeremías).
- **VULG** conserva los corchetes editoriales `[ ]` de la fuente; las glosas se descartan.
- Notas al pie, referencias cruzadas y títulos de sección de las fuentes no se importan.

## Pendientes

| Recurso | Situación |
|---|---|
| Torres Amat (1825) | Dominio público, pero **no existe** fuente digital estructurada verificable. Solo hay facsímiles (Wikisource DjVu, bibliotecas). Requiere OCR y revisión humana antes de incluirla. |
| Scío — Antiguo Testamento | El único módulo digital encontrado (CrossWire) es solo del NT. |
| Douay-Rheims Challoner (1749-52) | No se encontró en formato estructurado. Candidatos: Project Gutenberg #8300 (HTML), Internet Archive. |
| `VerseMapping` (Vulgata ↔ hebrea) | Tabla creada, todavía sin datos. |

## Candidatas para fases siguientes (por verificar)
Referencias cruzadas de OpenBible.info (CC-BY), comentario Haydock (1859) y *Catena Aurea* (traducciones de dominio público), Catholic Encyclopedia (1913), Padres de la Iglesia de Schaff (ANF/NPNF), y para las lenguas originales OSHB (hebreo, CC-BY) y SBLGNT/MorphGNT. Los textos del Catecismo y de los documentos pontificios recientes tienen copyright de la Santa Sede (Libreria Editrice Vaticana): solo se enlazarán o citarán salvo que haya licencia.
