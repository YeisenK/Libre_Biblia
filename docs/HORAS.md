# Oración de las Horas (H1)

Rótulo visible en `/horas/` y en cada hora: «Oración de las Horas según la estructura de la Liturgia de las Horas, con textos de dominio público; no es la traducción litúrgica aprobada.»

## Qué hay
Oficio de lectura, Laudes, Tercia, Sexta, Nona (Hora intermedia), Vísperas (con I Vísperas de domingos y solemnidades) y Completas. Motor puro en `packages/shared/src/hours/` (`hoursFor(fecha, hora, calendario, datos, opciones)`), datos en `tools/ingest/sources/hours/`, paquete `hours.es` (`pnpm --filter @bc/ingest hours` → `apps/web/public/packs/hours.es.pack`), interfaz en `apps/web/src/components/hours/` y `/horas/`. Enlazado desde Orar (`PrayerHub`).

## De dónde sale cada texto
| Parte | Origen | Estado de licencia |
|---|---|---|
| Distribución del salterio (4 semanas), salmos de Oficio, Laudes, hora intermedia, Vísperas, Completas | Hecho (qué salmo en qué día): tablas de catholic-resources.org (Felix Just) contrastadas con la tabla de Laudes/Vísperas de la Liturgy Office de Inglaterra y Gales (prueba automática) | Datos de hecho, no protegidos; no se copia texto de esas páginas |
| Lecturas breves por día/hora y primera lectura bíblica del Oficio | Mismas tablas (solo referencias bíblicas) | Hecho |
| Texto de salmos, cánticos, lecturas, versículos (Sal 31,6, etc.), Benedictus, Magníficat, Nunc dimittis | **Biblia instalada** (referencias; se convierte numeración y versificación hebreo→Vulgata/inglesa con `toVersion`); latín con la Vulgata | La licencia de cada Biblia |
| Antífonas de salmos | Primer versículo del propio salmo (derivado en ejecución) | Ídem |
| Himnos (16) | Latín: tradición del Breviario Romano anterior a 1568 (Ambrosio, Gregorio, Sedulio, Venancio Fortunato, Tomás de Aquino…) | Dominio público |
| Traducción de himnos y colectas | Propia, fiel, rotulada «Composición de Lux» | CC BY-SA 4.0 |
| Colectas (52) | Latín del Misal/Breviario Romano anteriores a 1970; **transcritas de memoria editorial: cotejar con edición escaneada PD antes de publicar** | PD (texto) |
| Antífonas «O» del 17 al 23 dic., antífonas marianas, Te Deum, Padre nuestro | Latín tradicional PD; traducción propia | PD / Lux |
| Invocaciones (Laudes/Vísperas), examen, bendición | Composición de Lux (no son las oficiales) | CC BY-SA 4.0 |

## Reglas del motor (resumen)
Semana del salterio: T.O., Adviento y Pascua `((n-1) mod 4)+1`; Ceniza–sábado = IV; Semana Santa = II (aprox.); Navidad por domingos (aprox.). Domingo y ferias: salterio del día; solemnidades (y octava de Pascua): Laudes/Vísperas/Oficio con salmos del domingo I y hora intermedia con salmodia complementaria (Sal 120-128); fiestas: Laudes y Vísperas del domingo I; memorias: salterio del día y colecta del común. I Vísperas si mañana es domingo o solemnidad de mayor rango. Sin Vísperas el Sábado Santo. Te Deum en Oficio de domingos (salvo Cuaresma), solemnidades y fiestas. Calendario: general o México (`liturgicalDay`).

## Pendiente / aproximaciones
Salmodia propia de solemnidades y del Triduo; propio de santos y comunes (se usa común genérico y lectura breve de fecha/común); segunda lectura del Oficio (Padres); responsorios (se usa un versículo bíblico fijo por hora); audio (claves `hours:…` listas, sin clips; el usuario prohibió generarlo); verificación de la semana del salterio en Navidad y de la salmodia complementaria (series de Sexta/Nona); cotejo de las colectas latinas.

## Si se obtiene licencia del texto oficial (CEM/CEE/LEV)
Añadir un paquete `hours.es-oficial` con el mismo esquema (`HoursPack`: himnos, colectas, invocaciones, responsorios, antífonas propias) y activarlo por ajuste; el motor ya separa estructura de texto, de modo que bastaría sustituir `texts`, `hymns`, `collects` y `preces` y, si la licencia lo permite, resolver salmos desde el salterio oficial en vez de la Biblia instalada. Hasta entonces nada oficial se incluye.
