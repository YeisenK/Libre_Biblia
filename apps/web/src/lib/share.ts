import { shareFileNative, shareTextNative } from './native/files';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Comparte con la Web Share API o, si no existe, copia al portapapeles. */
export async function shareText(text: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (await shareTextNative(text, title)) return 'shared';
  } catch {
    /* sigue con el método web */
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}

export async function shareOrDownloadImage(blob: Blob, filename: string, title: string): Promise<'shared' | 'downloaded'> {
  if (await shareFileNative(filename, blob, title)) return 'shared';
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Guarda/exporta un texto: en nativo abre la hoja de compartir; en la web descarga el archivo. Devuelve cómo se hizo. */
export async function downloadText(filename: string, content: string, type = 'application/json'): Promise<'shared' | 'downloaded'> {
  if (await shareFileNative(filename, content, filename)) return 'shared';
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
