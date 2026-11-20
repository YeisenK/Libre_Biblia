# Lista de publicación en Google Play (Libre Biblia)

Identificador: `io.github.yeisenk.librebiblia` · Versión inicial: 1 (0.1.0) · Idioma por defecto: español (Latinoamérica, `es-419`).

## 0. Antes de empezar (una sola vez)
1. **Respalda** `~/.android-keys/librebiblia-upload.jks` y `~/.android-keys/librebiblia-keystore.properties` en al menos dos lugares seguros (gestor de contraseñas / disco cifrado). Sin ellos no podrás subir actualizaciones sin pedir un restablecimiento de la clave de subida.
2. Cuenta de desarrollador de Google Play (pago único de 25 USD; verificación de identidad). Las cuentas **personales nuevas** (creadas desde nov. 2023) deben hacer una **prueba cerrada con al menos 12 testers que permanezcan suscritos durante 14 días consecutivos** antes de poder solicitar el acceso a producción.
3. Publica `PRIVACY.md` en la rama `main` de GitHub (la URL de la política debe responder 200): https://github.com/YeisenK/Libre_Biblia/blob/main/PRIVACY.md
4. Confirma que el catálogo oficial está publicado en `main` (https://cdn.jsdelivr.net/gh/YeisenK/Libre_Biblia@main/content/catalog.json): la app descarga de ahí.
5. Genera el paquete firmado:
   ```sh
   export LIBREBIBLIA_KEYSTORE_PROPERTIES=$HOME/.android-keys/librebiblia-keystore.properties
   pnpm --filter @bc/mobile build:android
   ```
   Salida: `apps/mobile/dist/app-release.aab` (a Play) y `app-release.apk` (pruebas). Comprueba: `jarsigner -verify apps/mobile/dist/app-release.aab`.

## 1. Crear la app (Play Console > Crear app)
- Nombre: **Libre Biblia** · Idioma predeterminado: Español (Latinoamérica) – es-419 · Aplicación · Gratuita.
- Declara las políticas del desarrollador y las leyes de exportación de EE. UU.

## 2. Ficha de Play Store (Crecimiento > Presencia en Play Store > Ficha de Play Store principal)
Copia el texto de `store/listing/es-419/` (título ≤30, descripción corta ≤80, completa ≤4000):
- `titulo.txt`, `descripcion-corta.txt`, `descripcion-completa.txt`.
- Icono 512×512: `store/graphics/icono-512.png`.
- Gráfico de funciones 1024×500: `store/graphics/grafico-destacado-1024x500.png`.
- Capturas de teléfono (mín. 2, recomendado 4-8): `store/graphics/telefono/` (usa las `claro`, y alguna `oscuro`).
- Tableta de 7": `store/graphics/tableta-7/` · Tableta de 10": `store/graphics/tableta-10/`.
- Traducción es-ES: **Presencia en Play Store > Ficha de Play Store personalizada / Traducciones**; pega `store/listing/es-ES/` (idéntico).
- Categoría: Libros y obras de consulta · Etiquetas: Biblia, religión · Email de contacto (obligatorio), sitio web https://github.com/YeisenK/Libre_Biblia

## 3. Contenido de la aplicación (Política > Contenido de la aplicación)
Sigue `store/DATA_SAFETY.md`:
1. **Política de privacidad**: pega la URL de `PRIVACY.md`.
2. **Anuncios**: No contiene anuncios.
3. **Acceso a la aplicación**: sin restricciones.
4. **Clasificación de contenido**: cuestionario IARC (categoría referencia/educación; solo «referencias religiosas» = sí).
5. **Público objetivo**: 13+ (según DATA_SAFETY.md), no atractiva para niños.
6. **Seguridad de los datos**: no recopila ni comparte datos; cifrado en tránsito (HTTPS).
7. **ID de publicidad**: No. **Aplicaciones de noticias / salud / financieras / gubernamentales**: No.

## 4. Configurar la versión (Probar y publicar)
1. **Integridad de la aplicación**: deja activada la **firma de aplicaciones de Play (Play App Signing)** al subir el primer AAB; Google custodia la clave de firma y tu `.jks` queda como clave de subida.
2. **Prueba interna** (rápida, hasta 100 testers, sin revisión larga): Pruebas > Pruebas internas > Crear versión > subir `app-release.aab` > notas de versión (`store/listing/es-419/notas-de-version.txt`, formato `<es-419>…</es-419>`) > guardar y publicar. Añade correos de testers y comparte el enlace de aceptación.
3. **Prueba cerrada** (obligatoria para cuentas personales nuevas): Pruebas > Pruebas cerradas > crea pista > añade **12 o más testers** (lista de correos o Google Group) > publica la versión. Los testers deben **aceptar la invitación y mantenerse 14 días continuos**. Pide su feedback.
4. Pasados los 14 días: Panel > **Solicitar acceso a producción** y responde el cuestionario (cómo hiciste la prueba, qué comentarios recibiste).
5. **Producción**: Producción > Crear versión > (reutiliza el AAB o sube uno con `versionCode` mayor) > notas de versión > **Revisar versión** > **Iniciar lanzamiento**. Elige países (todos) y despliegue gradual si quieres.
6. Revisión de Google: de horas a varios días. Revisa «Estado de la publicación».

## 5. Actualizaciones futuras
1. Sube `versionCode` (y `versionName`) en `apps/mobile/version.json` (cada subida requiere un `versionCode` mayor).
2. `pnpm --filter @bc/mobile build:android` con la variable de firma definida.
3. Sube el nuevo `app-release.aab` a la pista deseada con sus notas de versión.
4. Regenera capturas si cambió la interfaz: ver cabecera de `store/make-screenshots.mjs`.

## 6. Cosas que debes hacer tú (no automatizables)
- Crear la cuenta y pagar la tarifa; verificar identidad.
- Poner un correo de contacto de desarrollador.
- Reclutar 12+ testers para la prueba cerrada y mantenerlos 14 días.
- Contestar el cuestionario IARC y el de público objetivo con tu cuenta.
- Guardar copias de la clave de subida.
