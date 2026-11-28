"""Preprocesa una página del escaneo: gris, normalización de fondo, binarización, y localiza la raya que separa texto y notas.
Uso: prep.py in.jp2 out_body.png out_notes.png meta.json  (escribe recortes de cuerpo y notas)"""
import sys, json
import numpy as np
from PIL import Image, ImageFilter

def load(path):
    im = Image.open(path).convert('L')
    if im.width > 2200:
        im = im.resize((2000, round(im.height * 2000 / im.width)), Image.LANCZOS)
    return im

def binarize(im):
    a = np.asarray(im, dtype=np.float32)
    small = im.resize((im.width // 8, im.height // 8), Image.BILINEAR).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(6))
    bg = np.asarray(small.resize(im.size, Image.BILINEAR), dtype=np.float32)
    n = np.clip(a / np.maximum(bg, 1) * 255, 0, 255)
    return n

def long_runs(ink, minlen):
    """Por fila, nº de píxeles de tinta en tramos horizontales de al menos minlen."""
    H, W = ink.shape
    p = np.zeros((H, W + 2), dtype=np.int8)
    p[:, 1:-1] = ink
    d = np.diff(p, axis=1)
    out = np.zeros(H, dtype=np.int32)
    ys, xs = np.nonzero(d == 1)
    ye, xe = np.nonzero(d == -1)
    ln = xe - xs
    keep = ln >= minlen
    np.add.at(out, ys[keep], ln[keep])
    return out

def find_rule(n):
    """n: imagen normalizada (0-255). Devuelve (y0, x0, x1, y1) de la raya de las notas o None."""
    H, W = n.shape
    sc = W / 1503
    for thr in (175, 200, 215):
        score = long_runs(n < thr, int(60 * sc))
        cand = [y for y in range(int(H * 0.05), H - 5) if score[y] > W * 0.3]
        groups = []
        for y in cand:
            if groups and y - groups[-1][1] <= 4: groups[-1][1] = y
            else: groups.append([y, y])
        groups = [g for g in groups if g[1] - g[0] <= 14 * sc]
        if groups:
            g = groups[-1]
            return (g[0], 0, W, g[1])
    return None

def main():
    src, body, notes, meta = sys.argv[1:5]
    im = load(src)
    n = binarize(im)
    bwimg = (n > 150).astype(np.uint8) * 255   # blanco fondo
    ink = n < 140
    rule = find_rule(n)
    H, W = ink.shape
    m = {'w': W, 'h': H, 'rule': None}
    out = Image.fromarray(bwimg)
    if rule:
        y0, x0, x1, y1 = rule
        m['rule'] = [int(y0), int(y1), int(x0), int(x1)]
        out.crop((0, 0, W, y0 - 2)).save(body)
        out.crop((0, y1 + 3, W, H)).save(notes)
    else:
        out.save(body)
    json.dump(m, open(meta, 'w'))
if __name__ == "__main__": main()
