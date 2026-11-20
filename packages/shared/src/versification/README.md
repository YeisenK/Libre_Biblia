# Versificación

Conversión de referencias bíblicas versículo a versículo entre versificaciones.

```ts
import { convertVerse, convertRef } from './versification';
convertVerse('Ps', 50, 3, 'vulgate', 'english'); // { chapter: 51, verse: 1 }
convertVerse('Ps', 50, 3, 'vulgate', 'hebrew');  // { chapter: 51, verse: 3 }
convertRef({ book: 'Joel', chapter: 2, verseStart: 28 }, 'english', 'hebrew'); // Jl 3,1
```

## Tradiciones

| Valor | Biblias del repositorio | Notas |
|---|---|---|
| `vulgate` | VULG, DRA, SCIO | Salmos LXX/Vulgata; el título forma parte del v. 1 (o es el v. 1 si es largo). Ml 4, Jl 3 caps. |
| `english` | SBLM, BLL (eBible), KJV/NRSV | Salmos hebreos **sin** numerar el título (título = verso 0). Is 9,1 = hebreo 8,23. |
| `hebrew` | BHS, Biblia de Jerusalén | Títulos contados (v. 1-2). Ml 3,19-24, Jl 3-4. |
| `greek` (extra, no está en `Versification`) | LXX | Los deuterocanónicos de SBLM/BLL (Tob, Jdt, Sir, Dn, Est) siguen el griego. |

Los paquetes SBLM/BLL declaran hoy `versification: 'hebrew'`; en realidad son `english` en el protocanon.

## Semántica

- `convertVerse(book, chapter, verse, from, to)` → `{chapter, verse}` o `null` si el versículo no existe en el destino (Dn 3,24-90 y Est 10,4-16,24 de la Vulgata en english/hebrew, etc.). `book` es OSIS del canon (`Ps`, `Joel`, `Esth`...).
- `verse: 0` = título del salmo (en `english`). Un título hebreo (v. 1 o 1-2) convierte a 0; de 0 no se hace la ruta inversa.
- Versículo **dividido** en el destino (Os 2,23 english → 2,23-24 latín): se devuelve el primero. Versículos **unidos** (Gn 50,23-24 → 50,22 latín): todos devuelven el mismo.
- Lo no tabulado es identidad; la entrada debe ser un versículo válido de `from`.
- `convertRef` convierte inicio y fin (pueden acabar en otro capítulo). Capítulo completo → desde el v. 1 convertido hasta el último versículo tabulado. Inicio/fin inexistentes se ajustan al versículo más cercano dentro del rango; si ninguno existe devuelve la referencia original.
- Rangos entre capítulos en el origen se tratan por sus extremos (los versículos intermedios no se recorren).

## Datos

`data.ts` es **generado** (no editar): `pnpm --filter @bc/ingest versification`, a partir de `tools/ingest/raw/tvtms/tvtms.txt` (descargar de STEPBible-Data, ver `docs/SOURCES_AND_LICENSES.md`). Tramos `[capítulo, vDesde, vHasta, capítuloDestino, vDesdeDestino]` por par `origen>destino`; capítuloDestino 0 = inexistente. Parche manual en `tools/ingest/src/versification/build.ts`: adiciones de Ester y Cántico de Dn 3 (TVTMS no los expresa en numeración Vulgata). Ester `greek` no está soportada (identidad).

Fuente: STEPBible TVTMS, CC BY 4.0, Tyndale House / STEPBible.org.

## Validación (DRA vulgate ⇄ SBLM/BLL english, `versification.test.ts`)

- vulgate→english: 99,73 % de 35 569 versículos convertibles caen en un versículo existente (175 sin equivalente, 67 títulos de salmo).
- english→vulgate: 99,88 % de 35 361.
- Fallos residuales: Tob (21), Sir (55+1), Jdt (8), Est (3 + 31), NT críticos (Lc 17,36; Hch 8,37; 15,34; 24,7; Rm 14,24-26/16,25-27; 2 Co 13,14; 1 Ts 4,18; 2 Ts 2,17; Ap 12,18), 2 Mac 2,33, Sal 20,9, Is 46,13, Sab 19,22. Tobías, Judit y Sirácida en SBLM/BLL siguen el texto griego, distinto del latino; TVTMS no los cubre versículo a versículo con la Vulgata.
