// Build web -> cap sync -> AAB + APK release. Uso: pnpm --filter @bc/mobile build:android
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = path.join(mobile, 'android');
const env = { ...process.env };
// AGP/Gradle necesitan JDK 17-21; si no hay uno válido en JAVA_HOME, usa el JDK 21 habitual de Linux.
// (Gradle 8.14 no entiende JDK 25: si JAVA_HOME apunta a otro que no sea 17/21, se sustituye.)
const okJdk = env.JAVA_HOME && /(^|[-/])(17|21)([-./]|$)/.test(env.JAVA_HOME);
if (!okJdk && existsSync('/usr/lib/jvm/java-21-openjdk')) env.JAVA_HOME = '/usr/lib/jvm/java-21-openjdk';
const sdk = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT ?? path.join(os.homedir(), 'Android/Sdk');
env.ANDROID_HOME = sdk;
env.ANDROID_SDK_ROOT = sdk;

const run = (cmd, args, cwd) => {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run('pnpm', ['--filter', '@bc/web', 'build'], mobile);
run('npx', ['cap', 'sync', 'android'], mobile);
run('./gradlew', ['bundleRelease', 'assembleRelease'], androidDir);

const out = path.join(mobile, 'dist');
mkdirSync(out, { recursive: true });
const ks = env.LIBREBIBLIA_KEYSTORE_PROPERTIES ?? path.join(androidDir, 'keystore.properties');
const signed = existsSync(ks);
const files = [
  ['app/build/outputs/bundle/release/app-release.aab', 'app-release.aab'],
  [`app/build/outputs/apk/release/app-release${signed ? '' : '-unsigned'}.apk`, 'app-release.apk'],
];
for (const [src, name] of files) {
  const from = path.join(androidDir, src);
  if (!existsSync(from)) continue;
  copyFileSync(from, path.join(out, name));
  console.log(`${path.join(out, name)}  ${(statSync(from).size / 1048576).toFixed(1)} MB`);
}
if (!signed) console.warn('\nAVISO: salida SIN FIRMAR (no se encontró keystore.properties). No sirve para Google Play.');
