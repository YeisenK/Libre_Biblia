# Generador de voces de oración (Juglar)

Genera los paquetes `audio.oraciones.<voz>.json.gz` (`AudioPack`, ADR-015) leyendo `content/packs/prayers.es.json.gz`
con las voces de **Juglar** (`~/Juglar`, Qwen3-TTS en GPU) mediante su línea de órdenes `md2audio`. **No modifica Juglar**:
solo lee `~/.local/share/juglar/voces/<carpeta>/meta.json` y llama a `md2audio`.

## Requisitos
`md2audio` en el PATH (`~/.local/bin`), `ffmpeg`/`ffprobe`, y `pnpm install` hecho (usa el `tsx` de `tools/ingest`).
La GPU debe estar libre: el generador comprueba si hay un `qwen_worker.py` en marcha (Juglar abierto generando) y espera;
no lances dos procesos de Qwen a la vez (8 GB de VRAM).

## Voces
| `--voz` | Carpeta en Juglar | Etiqueta | Ajustes |
|---|---|---|---|
| `narrador` | `narrador` | Narrador (hombre) | temperature 0,9 |
| `fraile` | `fraile` | Fraile | temperature 0,9 |
| `helena` | `helena` | Helena (Elena) | temperature 0,9 |
| `micael` | `micael` | Micael (Mikael) | temperature 0,9 |

Los ajustes son los de Juglar: ninguna de estas voces tiene `ajustes.json`; `elenco.json` fija 0,9 / top_p 1,0 / top_k 50 /
repetition_penalty 1,05 / velocidad 1,0 (= valores de fábrica de `md2audio`). Se pasa `--qwen-ajustes '{"temperature":0.9}'`
de forma explícita para que el resultado no dependa de cambios futuros. La pronunciación (diccionario) y la normalización
de números las aplica Juglar. Cada clip se lee con revisión de Whisper (regenera fragmentos mal leídos) salvo `--no-revisar`.
Juglar nivela el volumen de los fragmentos (≈ −19 LUFS); el resultado se codifica a **Opus en OGG, mono, 36 kbps** (`libopus`, `voip`).

## Uso
```bash
# desde la raíz del repositorio
alias gen='tools/ingest/node_modules/.bin/tsx tools/audio/src/cli.ts'
gen --voz fraile --limite 4                 # prueba rápida (4 primeros clips)
gen --voz narrador --plan                   # solo muestra los clips y textos
gen --voz todas                             # lote completo de las cuatro voces
gen --voz fraile,helena --solo-rosario      # solo Rosario y misterios
```
Opciones: `--voz narrador|fraile|helena|micael|todas` (admite lista separada por comas), `--solo-rosario`, `--todas-oraciones`
(todas las del paquete, no solo Rosario y fundamentales), `--indicaciones` (`rosary:cue:inicio|fin`), `--limite N`,
`--claves prayer:gloria,…`, `--no-revisar`, `--plan`, `--oraciones RUTA`, `--biblia RUTA`, `--salida DIR`, `--sin-catalogo`,
`--muestras DIR` (copia los `.ogg` generados para escucharlos).

## Qué se genera
- `prayer:<id>`: las oraciones del Rosario (incluidos los extras del paquete) y las fundamentales. Texto sin Markdown;
  «V.» y «R.» se quitan y cada intervención queda en su párrafo.
- `mystery:<set>-<n>:announce` («Primer misterio gozoso: la Encarnación…»), `:reflection` y `:passage` (versículos de
  `bible.BLL.json.gz`, resueltos con `parseReference` de `@bc/shared`).
- `rosary:cue:<id>` solo con `--indicaciones`.
- Cada clip lleva `textSha256` (sha256 del texto leído) para detectar audios desfasados.

## Caché incremental y reanudación
`tools/audio/.cache/<voz>/<sha>.ogg` (ignorada por git). `<sha>` = sha256 de texto + ajustes + carpeta de la voz: solo se
regeneran los clips cuyo texto o ajustes cambiaron. Si se interrumpe, al relanzar se reanuda donde quedó (cada `.ogg` se
escribe de forma atómica). Para forzar una voz entera, borra su carpeta de caché.

## Salida
Con la salida por defecto (`content/packs/`) se escribe el paquete (`gzipDeterministic`) y se fusiona `content/catalog.json`
(colección «Voces de oración», autoridad `devotional`, CC BY-SA 4.0). Con `--salida otra/` el catálogo no se toca.
Las muestras de `tools/audio/muestras/` son solo para escuchar y probar.
