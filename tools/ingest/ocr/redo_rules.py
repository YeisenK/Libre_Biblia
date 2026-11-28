"""Recalcula la raya de notas de las páginas OCR hechas antes de mejorar prep.find_rule; borra su TSV si cambia, para rehacerlas.
Uso: redo_rules.py <tomo> (carpeta TA-ocr/<tomo>) <carpeta de imágenes>"""
import sys, os, json, glob
import prep
from concurrent.futures import ProcessPoolExecutor
vol, imgdir = sys.argv[1:3]
base = f'/home/void/BibliaCatolica/tools/ingest/raw/TA-ocr/{vol}'
pm = os.path.getmtime('/home/void/BibliaCatolica/tools/ingest/ocr/prep.py')
def chk(fn):
    n = fn[:-5]
    tsv = f'{base}/{n}.tsv'
    if not os.path.exists(tsv) or os.path.getmtime(tsv) > pm: return None
    meta = json.load(open(f'{base}/{n}.json'))
    jp2 = glob.glob(f'{imgdir}/*/*_{n}.jp2') or glob.glob(f'{imgdir}/*_{n}.jp2')
    im = prep.load(jp2[0]); r = prep.find_rule(prep.binarize(im))
    old = meta['rule'][0] if meta['rule'] else None
    new = r[0] if r else None
    if old != new and (old is None or new is None or abs(old - new) > 6):
        os.remove(tsv); return n
    return None
if __name__ == '__main__':
    fs = sorted(f for f in os.listdir(base) if f.endswith('.json'))
    with ProcessPoolExecutor(6) as ex: res = [r for r in ex.map(chk, fs, chunksize=8) if r]
    print(vol, 'rehacer', len(res))
