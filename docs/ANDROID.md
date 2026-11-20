# App Android (Google Play)

`apps/mobile` envuelve `apps/web/out` con Capacitor 8. `appId`: `io.github.yeisenk.librebiblia`. compileSdk/targetSdk 36, minSdk 24.

## Requisitos
- Node >= 22, pnpm, Android SDK (`~/Android/Sdk`, plataforma 36 y build-tools) y **JDK 17 o 21** (Gradle 8.14 no soporta JDK 25). El script usa `/usr/lib/jvm/java-21-openjdk` si `JAVA_HOME` no es válido.

## Compilar
```sh
pnpm --filter @bc/mobile build:android
```
Hace: build web (`next build`) → `cap sync android` → `./gradlew bundleRelease assembleRelease`. Copia el resultado a `apps/mobile/dist/` (`app-release.aab` para Play, `app-release.apk` para probar). Con `pnpm --filter @bc/mobile assets` se regeneran iconos, splash y gráficos de la ficha (`store/graphics`) desde el glifo vectorial de `scripts/gen-assets.mjs`.

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
- Solo permiso `INTERNET`. `usesCleartextTraffic=false` (todo HTTPS; el WebView sirve la app desde `https://localhost`).
- `allowBackup=true`: los datos (IndexedDB/localStorage del WebView) pueden entrar en la copia automática de Android y restaurarse al cambiar de móvil. Es opcional para el usuario y no sale a ningún servidor nuestro. Además existe exportar/importar copia manual en Ajustes.
- Los paquetes de contenido se descargan por `fetch` desde jsDelivr (CORS `*`). El service worker no se registra en nativo.

## Integración nativa (`apps/web/src/lib/native/`)
Detección con `Capacitor.isNativePlatform()` (import dinámico), compartir archivos/texto (Filesystem Cache + Share), botón atrás (cierra modal → `history.back()` → sale), barra de estado según tema, splash que se oculta al montar, enlaces externos en el navegador del sistema. En la web pura todo es no-op.
