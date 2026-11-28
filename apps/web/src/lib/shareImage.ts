export interface ShareImageInput {
  text: string;
  reference: string;
  version: string;
}

/** Divide el texto en líneas que caben en `maxWidth` según `measure`. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && measure(test) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderVerseImage({ text, reference, version }: ShareImageInput): Promise<Blob> {
  const W = 1080, pad = 96;
  const font = (px: number, w = 400) => `${w} ${px}px Georgia, "Times New Roman", serif`;
  const probe = document.createElement('canvas').getContext('2d')!;
  let size = 52;
  let lines: string[] = [];
  for (; size >= 30; size -= 4) {
    probe.font = font(size);
    lines = wrapLines(`“${text}”`, W - pad * 2, (s) => probe.measureText(s).width);
    if (lines.length * size * 1.45 < 900) break;
  }
  const lh = size * 1.45;
  const H = Math.max(1080, Math.round(pad * 2 + lines.length * lh + 200));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#faf7f0';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1f3a5f';
  ctx.fillRect(0, 0, W, 14);
  ctx.fillStyle = '#211e1a';
  ctx.font = font(size);
  ctx.textBaseline = 'top';
  const top = (H - (lines.length * lh + 120)) / 2;
  lines.forEach((l, i) => ctx.fillText(l, pad, top + i * lh));
  ctx.fillStyle = '#1f3a5f';
  ctx.font = font(36, 700);
  ctx.fillText(`${reference}`, pad, top + lines.length * lh + 36);
  ctx.fillStyle = '#625b50';
  ctx.font = font(26);
  ctx.fillText(`${version} · Lux`, pad, H - pad + 10);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo generar la imagen'))), 'image/png'));
}
