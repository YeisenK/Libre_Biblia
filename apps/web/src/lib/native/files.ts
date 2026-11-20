import { isNative } from './platform';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error ?? new Error('No se pudo leer el archivo'));
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.readAsDataURL(blob);
  });
}

const isCancel = (e: unknown) => /cancel/i.test(e instanceof Error ? e.message : String(e));

/**
 * En nativo: escribe el archivo en la caché y abre la hoja de compartir del sistema.
 * Devuelve false si no es nativo (el llamador usa el método web). `<a download>` no funciona en el WebView.
 */
export async function shareFileNative(filename: string, data: Blob | string, title: string): Promise<boolean> {
  if (!(await isNative())) return false;
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const { uri } =
    typeof data === 'string'
      ? await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache, encoding: Encoding.UTF8 })
      : await Filesystem.writeFile({ path: filename, data: await blobToBase64(data), directory: Directory.Cache });
  try {
    await Share.share({ title, dialogTitle: title, files: [uri] });
  } catch (e) {
    if (!isCancel(e)) throw e;
  }
  return true;
}

/** En nativo comparte texto con la hoja del sistema. Devuelve false si no es nativo. */
export async function shareTextNative(text: string, title: string): Promise<boolean> {
  if (!(await isNative())) return false;
  const { Share } = await import('@capacitor/share');
  try {
    await Share.share({ title, text, dialogTitle: title });
  } catch (e) {
    if (!isCancel(e)) throw e;
  }
  return true;
}
