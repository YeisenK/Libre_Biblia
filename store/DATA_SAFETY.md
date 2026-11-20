# Google Play: Seguridad de los datos, clasificación y público

## Formulario «Seguridad de los datos» (Play Console > Contenido de la aplicación)

| Pregunta | Respuesta |
|---|---|
| ¿Tu app recopila o comparte alguno de los tipos de datos de usuario requeridos? | **No** |
| ¿Todos los datos de usuario recopilados se cifran en tránsito? | La app no recopila datos; las descargas de contenido usan solo **HTTPS** (`usesCleartextTraffic=false`). Si el formulario lo pregunta: **Sí**. |
| ¿Ofreces una forma de solicitar la eliminación de los datos? | No aplica (no se recopilan datos). Los datos locales se borran desde Ajustes o desinstalando. |
| Política de privacidad (URL) | https://github.com/YeisenK/Libre_Biblia/blob/main/PRIVACY.md |

Justificación: marcadores, historial y ajustes viven solo en el almacenamiento local del dispositivo (IndexedDB del WebView) y no salen de él. No hay SDK de analítica, publicidad, fallos ni autenticación. Las únicas peticiones de red son descargas de paquetes de contenido (jsDelivr/GitHub u otros repositorios que el usuario añada). Permiso declarado: solo `INTERNET`.

## Otras declaraciones de contenido

- **Anuncios**: No contiene anuncios.
- **Acceso a la aplicación**: todas las funciones están disponibles sin credenciales ni restricciones.
- **ID de publicidad**: No se usa (no declara `AD_ID`).
- **Aplicación gubernamental / financiera / salud / noticias**: No.
- **Compras dentro de la aplicación**: No. App gratuita.
- **Público objetivo y contenido**: grupos de edad **13-15, 16-17 y 18+** (o 18+ si prefieres evitar el cumplimiento de «Diseñado para familias»). No marcar menores de 13: no es una app infantil y no se anuncia como tal.
- **¿Atrae involuntariamente a niños?**: No.

## Categoría sugerida

- Tipo: **Aplicación**. Categoría: **Libros y obras de consulta** (alternativa: Estilo de vida). Etiquetas: Biblia, religión, lectura, libros.
- Datos de contacto: correo del desarrollador (obligatorio) y sitio web https://github.com/YeisenK/Libre_Biblia

## Clasificación de contenido (cuestionario IARC)

Categoría del cuestionario: **Referencia, noticias o educación** (o «Otros» si no encaja). Respuestas:

| Pregunta | Respuesta |
|---|---|
| Violencia (gráfica, contra personas/animales) | No. *(Los textos bíblicos y literarios descargables pueden contener episodios bélicos o de violencia narrados en lenguaje literario, sin imágenes; no es contenido gráfico generado por la app.)* |
| Sangre / gore | No |
| Contenido sexual o desnudez | No |
| Lenguaje soez | No |
| Sustancias controladas (drogas, alcohol, tabaco) | No |
| Juegos de azar o simulados | No |
| Referencias o contenido religioso | **Sí** (textos religiosos: Biblia y devocionales católicos) |
| Contenido generado por usuarios / interacción entre usuarios | No |
| Compartir ubicación | No |
| Compras digitales | No |
| Acceso a internet sin restricciones / navegador web | No (solo se descarga contenido de repositorios; los enlaces externos abren el navegador del sistema) |

Resultado esperado: PEGI 3 / ESRB Everyone / equivalentes bajos. Si el cuestionario sugiere una edad algo mayor por las referencias a violencia en textos literarios, acéptala.
