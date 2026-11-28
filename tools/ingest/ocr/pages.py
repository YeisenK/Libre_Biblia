"""Lee los TSV de Tesseract de un tomo y produce pages.json: por página, cabecera y líneas del cuerpo.
Uso: pages.py <carpeta TA-ocr/tomo> <salida.json>"""
import sys, os, json, csv, re

def load_page(tsv, meta):
    lines = {}
    with open(tsv, encoding='utf8', newline='') as f:
        rd = csv.reader(f, delimiter='\t', quoting=csv.QUOTE_NONE)
        next(rd)
        for r in rd:
            if len(r) < 12 or r[0] != '5': continue
            txt = r[11].strip()
            if not txt: continue
            key = (int(r[2]), int(r[3]), int(r[4]))
            l = lines.setdefault(key, {'w': [], 'left': 10**9, 'top': 10**9, 'bot': 0, 'conf': []})
            l['w'].append(txt)
            l['left'] = min(l['left'], int(r[6])); l['top'] = min(l['top'], int(r[7]))
            l['bot'] = max(l['bot'], int(r[7]) + int(r[9]))
            l['conf'].append(float(r[10]))
    out = []
    for k in sorted(lines):
        l = lines[k]
        out.append({'t': ' '.join(l['w']), 'left': l['left'], 'top': l['top'], 'h': l['bot'] - l['top'],
                    'conf': round(sum(l['conf']) / len(l['conf']), 1), 'minconf': min(l['conf']),
                    'words': l['w']})
    return out

def main():
    d, outp = sys.argv[1:3]
    pages = {}
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.tsv'): continue
        n = fn[:-4]
        meta = json.load(open(os.path.join(d, n + '.json')))
        pages[n] = {'meta': meta, 'lines': load_page(os.path.join(d, fn), meta)}
    json.dump(pages, open(outp, 'w'), ensure_ascii=False)
    print(len(pages), 'páginas')
if __name__ == "__main__": main()
