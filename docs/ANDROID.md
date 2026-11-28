# App Android (Google Play) · Lux

`apps/mobile` envuelve `apps/web/out` con Capacitor 8. `appId`: `io.github.yeisenk.librebiblia`. compileSdk/targetSdk 36, minSdk 24.

## Requisitos
- Node >= 22, pnpm, Android SDK (`~/Android/Sdk`, plataforma 36 y build-tools) y **JDK 17 o 21** (Gradle 8.14 no soporta JDK 25). El script usa `/usr/lib/jvm/java-21-openjdk` si `JAVA_HOME` no es válido.

## Compilar
Atajo recomendado (comprueba requisitos, verifica la firma y deja `Lux-<versión>.apk/.aab` en `apps/mobile/dist/`):
```sh
scripts/build-apk.sh             # desde la copia de trabajo
scripts/build-apk.sh --clean     # desde el último commit, en un worktree limpio
scripts/build-apk.sh --install   # además instala y abre la app en el móvil conectado por USB
```
Paso a paso:
```sh
pnpm --filter @bc/mobile build:android
```
Hace: build web (`next build`) → `cap sync android` → `./gradlew bundleRelease assembleRelease`. Copia el resultado a `apps/mobile/dist/` (`app-release.aab` para Play, `app-release.apk` para probar). Con `pnpm --filter @bc/mobile assets` se regeneran iconos adaptativos (primer plano + **monocromo para Android 13+**), splash, iconos de iOS y gráficos de la ficha (`store/graphics`) desde la marca de Lux (`apps/web/scripts/brand.mjs`; la web usa `node scripts/gen-icons.mjs` en `apps/web`). El nombre visible es **Lux**; el `applicationId` no cambia (ADR-019).

## Versión (fuente única)
`apps/mobile/version.json`: `versionCode` (entero, **debe subir en cada subida a Play**) y `versionName` (visible). Edita ese archivo y vuelve a compilar; `build.gradle` lo lee directamente.

## Firma
Play App Signing: Google custodia la clave de **firma** definitiva; la que generamos es solo la de **subida** (upload key). Si se pierde o se compromete, se puede pedir un restablecimiento en Play Console, pero conviene evitarlo.

- Clave: `~/.android-keys/librebiblia-upload.jks` (RSA 4096, alias `upload`, 10000 días) y contraseñas en `~/.android-keys/librebiblia-keystore.properties` (permisos 600). **Fuera del repositorio.**
- **DEBES respaldar ambos archivos** (gestor de contraseñas o disco cifrado, en más de un sitio).
- Gradle busca la configuración en `LIBREBIBLIA_KEYSTORE_PROPERTIES` o en `apps/mobile/android/keystore.properties` (ignorado por git). Formato: `storeFile`, `storePassword`, `keyAlias`, `keyPassword`. Sin ese archivo el release sale **sin firmar** y Gradle avisa.
```sh
export LIBREBIBLIA_KEYSTORE_PROPERTIES=$HOME/.android-keys/librebiblia-keystore.properties
pnpm --filter @bc/mobile build:android
```

## Manifest y datos
- Permisos: `INTERNET` y los del plugin de notificaciones locales (`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`). `SCHEDULE_EXACT_ALARM` se elimina explícitamente (`tools:node="remove"`): las notificaciones usan alarmas inexactas y pueden retrasarse unos minutos. `usesCleartextTraffic=false` (todo HTTPS; el WebView sirve la app desde `https://localhost`).
- `allowBackup=true`: los datos (IndexedDB/localStorage del WebView) pueden entrar en la copia automática de Android y restaurarse al cambiar de móvil. Es opcional para el usuario y no sale a ningún servidor nuestro. Además existe exportar/importar copia manual en Ajustes.
- Los paquetes de contenido se descargan por `fetch` desde jsDelivr (CORS `*`). El service worker no se registra en nativo.

## Integración nativa (`apps/web/src/lib/native/`)
Detección con `Capacitor.isNativePlatform()` (import dinámico), compartir archivos/texto (Filesystem Cache + Share), botón atrás (cierra modal → `history.back()` → sale), barra de estado según tema, splash que se oculta al montar, enlaces externos en el navegador del sistema. En la web pura todo es no-op.


## Cabecera del lector en Android 15 (edge-to-edge) · corregido en 0.5.0
**Síntoma (Samsung S24 Ultra, Android 15):** en el APK los botones de la cabecera móvil del lector (`data-testid="reader-bar-mobile"`: «⋯», capítulo anterior/siguiente, versión) no respondían al toque; en Chromium de escritorio sí. Al ocultarse la barra al bajar, el texto se dibujaba bajo la barra de estado.

**Causa (hipótesis más sólida; no se pudo reproducir en el teléfono, ver «Sin probar en dispositivo»):** con `targetSdk 36` Android 15 fuerza edge-to-edge y Capacitor 8 (`SystemBars`, `insetsHandling: css`) entrega el WebView a pantalla completa. El código leía solo `env(safe-area-inset-top)`, que en WebView puede valer 0 (WebView < 140 con relleno nativo, o sin recalcular tras cambiar los insets; ver chromium 461332423). Con inset 0 la cabecera `sticky top-0` quedaba **dentro de la franja de la barra de estado**: el sistema se queda con los toques de esa zona (desplegar notificaciones) y, al ocultar la cabecera con `-translate-y-full`, el contenido se veía bajo la barra transparente. Descartado: `onTouchStart/End` del contenedor (no llaman a `preventDefault`), `-mx-5` y capas `fixed` (la barra inferior solo cubre abajo).

**Corrección:**
- `globals.css` define `--sat/--sab/--sal/--sar = max(env(safe-area-inset-*), var(--safe-area-inset-*))`; el segundo valor lo inyecta Capacitor con los insets reales. Todo el código usa estas variables (`pt-[max(0.25rem,var(--sat))]`).
- `AppShell` dibuja, en las rutas de lectura (`/leer`, `/documento`), una **franja de fondo** `fixed` de altura `--sat` bajo la barra de estado (sin eventos de puntero).
- La cabecera del lector usa fondo sólido (sin `backdrop-blur`, que en WebView compone una capa propia), `touch-manipulation` y, al ocultarse, `pointer-events-none`.
- `capacitor.config.ts`: `SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover' }` evita el salto de maquetación inicial.

**Sin probar en dispositivo:** al cerrar esta ola no había teléfono conectado (`adb devices` vacío). Verificado con Playwright en modo móvil táctil (`hasTouch`, `isMobile`) simulando `--safe-area-inset-top: 48px` inyectado como lo hace Capacitor: los botones responden y la franja cubre la barra. **Pendiente comprobar en el S24 Ultra:** `LB_DEBUG=1 scripts/build-apk.sh --install` y abrir `chrome://inspect`; si siguiera fallando, mirar `getComputedStyle(document.documentElement).getPropertyValue('--sat')` y `document.elementFromPoint(x, y)` sobre un botón de la cabecera.

## Lista de comprobación para publicar en Google Play (Lux 0.5.0)
- [x] `applicationId` `io.github.yeisenk.librebiblia` (no cambia, ADR-019), `versionCode 5` / `versionName 0.5.0` en `apps/mobile/version.json`.
- [x] `compileSdk`/`targetSdk` 36 (Play exige 35 o superior para apps nuevas y actualizaciones desde 31-08-2025; revisar cada año: sube en agosto), `minSdk` 24 (Android 7).
- [x] Permisos mínimos: `INTERNET`, `POST_NOTIFICATIONS` (Android 13+, en ejecución), `RECEIVE_BOOT_COMPLETED` y `WAKE_LOCK` (reprogramar avisos tras reiniciar). `SCHEDULE_EXACT_ALARM` eliminado: los avisos son inexactos y no hace falta la declaración de alarmas exactas en Play Console.
- [ ] **Audio en segundo plano (Rosario con voz)**: hoy el audio es HTML dentro del WebView; Android puede detenerlo con la pantalla apagada o en segundo plano. Para fiabilidad hace falta un **servicio en primer plano de tipo `mediaPlayback`** (`FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, notificación de reproducción) mediante un plugin de audio nativo. **No implementado**; si se añade, declarar el uso en el formulario «Servicios en primer plano» de Play Console.
- [ ] AAB firmado con la clave de subida (`build-apk.sh` verifica la firma); activar Play App Signing.
- [ ] Ficha: título «Lux», descripciones, capturas y gráfico destacado (`store/graphics/`, regenerados con la marca nueva), política de privacidad (`PRIVACY.md`, publicada en una URL), clasificación de contenido, público objetivo.
- [ ] Sección «Seguridad de los datos»: no se recopilan ni comparten datos; el contenido se descarga de jsDelivr (sin datos personales).
- [ ] Declaración de anuncios: sin anuncios. Sin cuentas: no hace falta URL de eliminación de cuenta.
- [ ] Probar en Android 15/16 (edge-to-edge) y en uno antiguo (API 24–28); modo oscuro y tema claro; notificaciones tras reiniciar; sin conexión.
- [ ] Pruebas internas → cerradas (para cuentas personales nuevas, 12 evaluadores durante 14 días antes de producción) → producción.
- [ ] Reducción de tamaño: valorar `minifyEnabled`/`shrinkResources` (hoy desactivado; el WebView hace casi todo el trabajo) y revisar que el AAB no supere 200 MB (los paquetes se descargan, no van incluidos salvo los de `public/packs`).
