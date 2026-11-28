# App iOS (App Store) · Lux

Estado: el proyecto Xcode **existe y está configurado**, pero **no se ha compilado ni probado** (esta máquina es Linux, sin Xcode). Todo lo de abajo hay que hacerlo en un Mac.

## Qué hay
- `apps/mobile/ios/` creado con `npx cap add ios` (Capacitor 8, **Swift Package Manager**, sin CocoaPods). Plataforma `@capacitor/ios` ^8 añadida a `apps/mobile`.
- Nombre visible **Lux** (`CFBundleDisplayName`); Bundle ID `io.github.yeisenk.librebiblia` (el mismo `appId`; ADR-019); versión 0.5.0 (`MARKETING_VERSION`) y build 5 (`CURRENT_PROJECT_VERSION`). Mínimo iOS 15.
- `Info.plist` (`apps/mobile/ios/App/App/Info.plist`):
  - `UIBackgroundModes: audio` (Rosario y oraciones con voz con la pantalla bloqueada).
  - `UIFileSharingEnabled` y `LSSupportsOpeningDocumentsInPlace` (carpeta de Lux en Archivos; importar EPUB, PDF, TXT y Markdown), más `CFBundleDocumentTypes` (EPUB, PDF, texto, Markdown como tipo importado `net.daringfireball.markdown`).
  - `ITSAppUsesNonExemptEncryption = false` (solo HTTPS del sistema).
  - Idioma de desarrollo `es`; capacidad `arm64`.
  - **Notificaciones**: las locales no necesitan clave en `Info.plist`; iOS pide permiso al llamar a `LocalNotifications.requestPermissions()`. No hace falta la capacidad Push (no hay servidor).
- Icono 1024 y splash (2732) con la marca de Lux, generados por `pnpm --filter @bc/mobile assets`.
- `capacitor.config.ts`: `ios.backgroundColor` `#0b0b12`, `contentInset: 'never'` (la web gestiona áreas seguras con `viewport-fit=cover`).

## Requisitos exactos
1. **Mac** con macOS reciente y **Xcode 16 o superior** (Capacitor 8 pide Xcode 16+; con SPM no hace falta CocoaPods).
2. Node >= 22 y pnpm (`corepack enable`).
3. **Cuenta de Apple Developer** (99 USD/año) para instalar en un iPhone durante más de 7 días, TestFlight y App Store. Para probar en simulador basta Xcode gratuito.
4. **App Store Connect**: crear la app con el Bundle ID `io.github.yeisenk.librebiblia` (registrarlo antes en *Certificates, Identifiers & Profiles*), nombre «Lux» (comprobar que esté libre en la tienda), idioma principal español, categoría Referencia o Estilo de vida, política de privacidad (URL de `PRIVACY.md`), «Privacidad de la app: datos no recopilados», clasificación por edades, capturas (6,9" y 6,5"; iPad si se admite), icono 1024.

## Pasos
```sh
pnpm install
pnpm --filter @bc/web build                 # genera apps/web/out
cd apps/mobile && npx cap sync ios          # copia la web y actualiza los plugins
npx cap open ios                            # abre Xcode
```
En Xcode: destino *App* → *Signing & Capabilities*: elegir el **Team**, mantener «Automatically manage signing». Comprobar que *Background Modes → Audio, AirPlay and Picture in Picture* aparece marcado (ya viene de `Info.plist`; Xcode lo muestra como capacidad). Product → Archive → Distribute App → App Store Connect → subir. Después: TestFlight (pruebas internas) y enviar a revisión.

## Qué no se ha podido probar (todo)
- Compilación y arranque en simulador o dispositivo; firma; archivo `.ipa`.
- Audio en segundo plano con pantalla bloqueada y controles de pantalla de bloqueo (HTML audio en `WKWebView`; si el sistema lo corta hará falta un plugin de audio nativo con `MPNowPlayingInfoCenter`).
- Notificaciones locales: límite de **64 avisos pendientes** en iOS (hay que reprogramar de forma escalonada); permiso y zonas horarias.
- Importación desde Archivos (selector de documentos), áreas seguras y barra de estado (`@capacitor/status-bar`), teclado y rotación.
- Revisión de Apple: la guía 4.2 (funcionalidad mínima) no debería afectar (app con contenido propio); el contenido se descarga de jsDelivr: describirlo en las notas de revisión. Sin cuentas, por lo que no se pide «Iniciar sesión con Apple».
- El Mac solo es necesario para compilar; `apps/mobile/ios/App/App/public` se regenera con `cap sync` (no se versiona).
