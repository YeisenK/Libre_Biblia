"""Ensambla versículos a partir de pages.json de un tomo (salida de pages.py).
Uso: assemble.py <tomo> <pages.json> <salida.json>
Produce una lista plana de eventos y de versículos con procedencia (tomo, imagen)."""
import sys, json, re, statistics
from difflib import SequenceMatcher
from books import strip

ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
def roman(s):
    s = s.upper().replace('1', 'I').replace('L', 'L').replace('|', 'I').replace('!', 'I')
    s = re.sub(r'[^IVXLCDM]', '', s)
    if not s: return None
    tot = 0
    for i, c in enumerate(s):
        v = ROMAN[c]
        if i + 1 < len(s) and ROMAN[s[i + 1]] > v: tot -= v
        else: tot += v
    return tot

def is_cap(tok):
    t = strip(tok).upper()
    return len(t) >= 6 and SequenceMatcher(None, t, 'CAPITULO').ratio() >= 0.74

def heading(line):
    """Devuelve ('CAP', numeral) o ('SAL', numeral) si la línea es encabezado de capítulo/salmo."""
    w = line['words']
    if len(w) < 1 or len(w) > 4: return None
    if is_cap(w[0]):
        n = roman(w[1].strip('.,:;')) if len(w) > 1 else None
        return ('CAP', n, line['t'])
    if len(w) >= 2 and SequenceMatcher(None, strip(w[0]).upper(), 'SALMO').ratio() >= 0.8 and roman(w[1].strip('.,:;')):
        return ('SAL', roman(w[1].strip('.,:;')), line['t'])
    return None

HEAD_RE = re.compile(r'LIBRO|CAP[IÍ]TULO|EP[IÍ]STOLA|PROFEC|SALMO|TOMO|PROLOGO|PRÓLOGO|ADVERTENCIA|[A-ZÁÉÍÓÚ]{4,}', re.I)
def is_header(line, med):
    t = line['t']
    letters = [c for c in t if c.isalpha()]
    if not letters: return line['top'] < 200
    up = sum(1 for c in letters if c.isupper()) / len(letters)
    return line['h'] < 0.85 * med and up > 0.6 or (line['top'] < 140 and up > 0.8 and line['h'] < 0.85 * med)

DIG_OK = {'0': 'Oo0Q', '1': '1lI|!i', '2': '2Z', '3': '3', '4': '4A', '5': '5S', '6': '6Gb', '7': '7', '8': '8SB', '9': '9g'}
def matches_num(tok, n):
    s = str(n)
    tok = tok.rstrip('.')
    if len(tok) != len(s): return False
    return all(tok[i] in DIG_OK[s[i]] for i in range(len(s)))

def main():
    vol, pj, outp = sys.argv[1:4]
    pages = json.load(open(pj))
    events = []   # ('HDR',page,title) ('CAP',page,num,raw) ('SAL',...) ('TXT',page,text,top,h)
    for pn in sorted(pages):
        L = pages[pn]['lines']
        if not L: events.append({'k': 'EMPTY', 'p': pn}); continue
        hs = [l['h'] for l in L if len(l['words']) >= 3]
        med = statistics.median(hs) if hs else 60
        if not pages[pn]['meta'].get('rule'):
            # sin raya detectada: recorta notas por tamaño de letra (≥4 palabras y letra menor, hasta el final)
            bigs = [i for i, l in enumerate(L) if len(l['words']) >= 4 and l['h'] >= 0.9 * med]
            lastbig = bigs[-1] if bigs else -1
            for i in range(lastbig + 1, len(L)):
                if len(L[i]['words']) >= 4 and L[i]['h'] < 0.8 * med and i > 2:
                    if all(l['h'] < 0.9 * med or len(l['words']) < 4 for l in L[i:]):
                        L = L[:i]; break
        lefts = sorted(l['left'] for l in L if len(l['words']) >= 3)
        base = lefts[len(lefts) // 5] if lefts else 0
        sc = pages[pn]['meta']['w'] / 1503
        zone = 0.13 * pages[pn]['meta']['w']
        for i, l in enumerate(L):
            hd0 = heading(l)
            tl = l['t'].upper()
            if l['top'] < zone and i < 3 and (is_header(l, med) or (hd0 and l['top'] < 0.085 * pages[pn]['meta']['w'] + 30 and 'PRIMERO' not in tl) or len(l['t']) < 4):
                events.append({'k': 'HDR', 'p': pn, 't': l['t']}); continue
            hd = heading(l)
            if hd: events.append({'k': hd[0], 'p': pn, 'n': hd[1], 't': hd[2], 'top': l['top']}); continue
            events.append({'k': 'TXT', 'p': pn, 't': l['t'], 'words': l['words'], 'left': l['left'], 'ind': round((l['left'] - base) / sc), 'top': l['top'], 'h': l['h'], 'conf': l['conf'], 'minconf': l['minconf'], 'big': l['h'] > 1.25 * med})
    json.dump(events, open(outp, 'w'), ensure_ascii=False)
    print(vol, len(events), 'eventos')
if __name__ == "__main__": main()
