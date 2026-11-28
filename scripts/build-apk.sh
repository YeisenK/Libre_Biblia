#!/usr/bin/env bash
# Compila Lux para Android (APK + AAB firmados) y, opcionalmente, la instala.
#
# Uso:
#   scripts/build-apk.sh                 # compila desde la copia de trabajo actual
#   scripts/build-apk.sh --clean         # compila el último commit en un worktree limpio
#   scripts/build-apk.sh --install       # además instala el APK en el dispositivo conectado
#   ANDROID_SERIAL=XXXX scripts/build-apk.sh --install   # si hay varios dispositivos
#
# Requisitos: Node >= 22, pnpm 9, Android SDK (plataforma 36), JDK 17 o 21.
# Firma: clave de subida en ~/.android-keys/ (ver docs/ANDROID.md). Sin ella, el release sale sin firmar.
set -euo pipefail

CLEAN=0
INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --clean) CLEAN=1 ;;
    --install) INSTALL=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Opción desconocida: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/apps/mobile/dist"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
export LIBREBIBLIA_KEYSTORE_PROPERTIES="${LIBREBIBLIA_KEYSTORE_PROPERTIES:-$HOME/.android-keys/librebiblia-keystore.properties}"

die() { echo "Error: $*" >&2; exit 1; }
command -v node >/dev/null || die "falta Node.js"
command -v pnpm >/dev/null || die "falta pnpm (npm i -g pnpm@9)"
[ -d "$SDK/platforms" ] || die "no se encuentra el Android SDK en $SDK"
BT="$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1)"
[ -n "$BT" ] || die "faltan las build-tools del Android SDK"
if [ ! -f "$LIBREBIBLIA_KEYSTORE_PROPERTIES" ]; then
  echo "Aviso: no existe $LIBREBIBLIA_KEYSTORE_PROPERTIES; el release saldrá SIN FIRMAR." >&2
fi

SRC="$ROOT"
WT=""
if [ "$CLEAN" = 1 ]; then
  WT="$(mktemp -d "${TMPDIR:-/tmp}/librebiblia-build.XXXXXX")"
  echo "> Worktree limpio de $(git -C "$ROOT" rev-parse --short HEAD) en $WT"
  git -C "$ROOT" worktree add --detach "$WT" HEAD >/dev/null
  trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
  SRC="$WT"
  (cd "$SRC" && pnpm install --frozen-lockfile)
fi

cd "$SRC"
pnpm --filter @bc/shared build
pnpm --filter @bc/mobile build:android

VERSION="$(node -p "require('./apps/mobile/version.json').versionName")"
mkdir -p "$OUT"
APK="$OUT/Lux-$VERSION.apk"
AAB="$OUT/Lux-$VERSION.aab"
cp "$SRC/apps/mobile/dist/app-release.apk" "$APK"
cp "$SRC/apps/mobile/dist/app-release.aab" "$AAB"
if [ "$SRC" != "$ROOT" ]; then
  cp "$SRC/apps/mobile/dist/app-release.apk" "$OUT/app-release.apk"
  cp "$SRC/apps/mobile/dist/app-release.aab" "$OUT/app-release.aab"
fi

echo
echo "> Firma del APK"
"$BT/apksigner" verify --print-certs "$APK" | grep -E 'DN|SHA-256' || die "el APK no está firmado"
echo
echo "APK (pruebas):     $APK ($(du -h "$APK" | cut -f1))"
echo "AAB (Google Play): $AAB ($(du -h "$AAB" | cut -f1))"

if [ "$INSTALL" = 1 ]; then
  ADB="$SDK/platform-tools/adb"
  mapfile -t DEVICES < <("$ADB" devices | awk 'NR>1 && $2=="device" {print $1}')
  if [ -n "${ANDROID_SERIAL:-}" ]; then
    TARGET="$ANDROID_SERIAL"
  elif [ "${#DEVICES[@]}" -eq 1 ]; then
    TARGET="${DEVICES[0]}"
  elif [ "${#DEVICES[@]}" -eq 0 ]; then
    die "no hay ningún dispositivo conectado (activa la depuración USB y acepta la huella del PC)"
  else
    die "hay varios dispositivos: ${DEVICES[*]}. Indica uno con ANDROID_SERIAL=..."
  fi
  echo
  echo "> Instalando en $TARGET"
  "$ADB" -s "$TARGET" install -r "$APK"
  "$ADB" -s "$TARGET" shell monkey -p io.github.yeisenk.librebiblia -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
  echo "Instalada y abierta."
fi
