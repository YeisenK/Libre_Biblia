# ADR-019: La app pasa a llamarse Lux; los identificadores técnicos no cambian

- Estado: aceptada (25-11-2026)
- Contexto: «Libre Biblia» era el nombre de trabajo. La app abarca ya oración, liturgia, biblioteca y formación, y toma el nombre **Lux** («Yo soy la luz del mundo», Jn 8,12).

## Decisión
Cambia **solo lo visible**: título y metadatos web, manifiesto PWA (`name`, `short_name`), `app_name` de Android (`strings.xml`), `appName` de Capacitor, textos de la interfaz, README y documentación, ficha de la tienda, logotipo e iconos (`apps/web/scripts/brand.mjs`, `gen-icons.mjs`, `apps/mobile/scripts/gen-assets.mjs`).

**No cambia** (a propósito):

| Elemento | Valor | Por qué |
|---|---|---|
| `appId` / `applicationId` / `namespace` | `io.github.yeisenk.librebiblia` | Google Play identifica la app por este id; cambiarlo crea **otra** app, sin actualización para quien ya la tiene, sin reseñas ni instalaciones. Tampoco es modificable después de publicar. En iOS, el Bundle ID se fija igual al crear la app en App Store Connect. |
| Base de datos IndexedDB | `bc-local` | Cambiar el nombre abre una base vacía: el usuario perdería marcadores, historial, notas, rutinas y paquetes descargados. |
| Claves de `localStorage` | `bc.*` (`bc.settings`, …) | Mismo motivo: ajustes y última lectura. |
| URL del repositorio, del CDN (jsDelivr) y del catálogo | `YeisenK/Libre_Biblia`, `content/` | Los dispositivos instalados descargan paquetes de esas URL; renombrar el repositorio las rompe (GitHub redirige el repositorio, pero jsDelivr no sigue las redirecciones). |
| Nombres internos (`@bc/*`, `bc-*`, `LIBREBIBLIA_KEYSTORE_PROPERTIES`, `~/.android-keys/librebiblia-*`) | sin cambio | Solo los ven los desarrolladores. |
| Nombre del catálogo (`catalog.json`, «Libre Biblia — repositorio oficial») | sin cambio por ahora | Se regenera con la ingesta; no afecta a la identidad visible. |

## Cómo se haría una migración futura (si algún día fuera imprescindible)
1. **IndexedDB / localStorage**: publicar una versión puente que abra la base antigua (`bc-local`) **y** la nueva, copie todas las tablas y claves, verifique recuentos y marque `bc.migrated=2`. Mantener la lectura de la antigua al menos dos versiones antes de borrarla. Dexie permite abrir ambas bases en la misma carga.
2. **Android**: un `applicationId` nuevo es una app nueva; los datos del WebView no se heredan. La única vía es publicar en la app antigua una versión que **exporte la copia de seguridad** (ya existe en Ajustes) y dirija a la nueva, que la importa. Hay que conservar la ficha antigua con aviso de traslado.
3. **CDN**: crear el nuevo repositorio, mantener el antiguo sirviendo `content/` y el catálogo durante varias versiones, y añadir el catálogo nuevo en la app antes de retirar el antiguo.
4. Comunicarlo en las notas de versión y en la pantalla de Ajustes.

## Consecuencias
- La actualización a Lux conserva todos los datos de los usuarios existentes.
- Algunos identificadores técnicos seguirán diciendo «librebiblia»; es esperado y está documentado aquí.
