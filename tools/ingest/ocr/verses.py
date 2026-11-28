"""Eventos (assemble.py) -> versículos con procedencia. Uso: verses.py <vol> <events.json> <salida.json>"""
import sys, json, re
from difflib import SequenceMatcher
from books import strip, TITLES, vulg_counts
from assemble import roman, matches_num

TA_ORDER = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Tob','Jdt','Esth','Job','Ps','Prov','Eccl','Song','Wis','Sir','Isa','Jer','Lam','Bar','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','1Macc','2Macc',
  'Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev']
PRE_RE = re.compile(r'^\W*(LIBRO|PR[OÓ]LOGO|PREF|ARGUMENTO|INTRODUC|PROFEC[IÍ]A|EP[IÍ]STOLA|ADVERTENCIA|FIN\b|CANTAR|LAMENTACIONES|SALMOS)', re.I)
MARKS = re.compile(r"[*'’‘°¹²³†‡´`^]")

def title_of(h):
    t = strip(h).upper()
    t = re.sub(r'[^A-Z ]', ' ', t)
    t = re.sub(r'\b(LIBRO|DEL|DE|LA|EL|LOS|LAS|A)\b', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def guess_book(hdrs):
    best = (0, None)
    for osis, names in TITLES.items():
        for nm in names:
            n = title_of(nm)
            for h in hdrs:
                t = title_of(h)
                if len(t) < 3: continue
                r = SequenceMatcher(None, t, n).ratio()
                if r > best[0]: best = (r, osis)
    return best

def clean_tokens(words):
    out = []
    for w in words:
        w2 = MARKS.sub('', w)
        if w2 == '': continue
        out.append(w2)
    return out

def join(a, b):
    if re.search(r'[A-Za-zÁÉÍÓÚáéíóúñÑüÜ][-=¬]$', a) and b and b[0].islower():
        return a[:-1] + '‐' + b
    return a + ' ' + b

def main():
    vol, ep, outp = sys.argv[1:4]
    ev = json.load(open(ep))
    books = []     # lista de dicts: {osis, guess, chapters: {n: [ [v, text, page] ]}, issues}
    issues = []
    cur_book = None
    chap = 0; exp = 1; state = "pre"; sumario = 0
    verse = None
    lastpage = None
    pending = True

    def close_verse():
        nonlocal verse
        if verse and cur_book is not None:
            cur_book['chapters'].setdefault(chap, []).append(verse)
        verse = None

    def start_book(first_hdr_idx, n):
        nonlocal cur_book
        # cabeceras de las páginas siguientes
        hs = []
        for e in ev[first_hdr_idx:first_hdr_idx + 400]:
            if e['k'] == 'HDR': hs.append(e['t'])
            if len(hs) >= 6: break
        r, osis = guess_book(hs)
        cur_book = {'osis': osis, 'score': round(r, 2), 'vol': vol, 'start': ev[first_hdr_idx]['p'], 'chapters': {}, 'hdrs': hs[:3]}
        books.append(cur_book)

    for idx, e in enumerate(ev):
        k = e['k']
        if k == 'HDR' or k == 'EMPTY':
            continue
        lastpage = e['p']
        if k in ('CAP', 'SAL'):
            close_verse()
            n = e['n']
            is_first = k == 'CAP' and (pending or cur_book is None or 'PRIM' in strip(e['t']).upper())
            if k == 'SAL':
                if cur_book is None or cur_book['osis'] != 'Ps':
                    start_book(idx, n); cur_book['osis'] = 'Ps'; chap = 0
            elif is_first:
                start_book(idx, n); chap = 0
            pending = False
            chap += 1
            if n not in (None, chap, 999 if chap == 1 else -1) and not (is_first and chap == 1):
                issues.append({'p': e['p'], 'vol': vol, 'msg': f'capítulo: numeral {n} ({e["t"]}) pero secuencia da {chap}'})
            exp = 1; state = 'sum'; sumario = 0
            continue
        # TXT
        words = clean_tokens(e['words'])
        if not words: continue
        txt0 = ' '.join(words)
        if state == 'pre':
            continue
        letters = [c for c in txt0 if c.isalpha()]
        upper = letters and sum(c.isupper() for c in letters) / len(letters) > 0.85 and len(letters) >= 5
        if state == 'verse' and (upper and PRE_RE.match(txt0) or e.get('big') and len(letters) <= 40 and upper):
            close_verse(); state = 'pre'; pending = True; continue
        # ¿empieza en marcador de versículo?
        def marker_at(ws, want):
            if ws and matches_num(ws[0], want) and len(ws) > 1: return True
            return False
        if state == 'sum':
            if (matches_num(words[0], 1) or words[0] in ('1', 'l', 'I', '|')) and len(words) > 1:
                state = 'verse'; exp = 1
            else:
                sumario += 1
                if sumario > 9:
                    issues.append({'p': e['p'], 'vol': vol, 'msg': f'sumario largo tras cap {chap}'}); state = 'verse'
                continue
        par = e['ind'] > 22
        def newverse(n, why=None):
            nonlocal verse, exp
            close_verse()
            verse = [n, '', [vol, e['p']]]
            exp = n + 1
            if why: issues.append({'p': e['p'], 'vol': vol, 'msg': why, 'vs': [chap, n]})
        def push(ws):
            if not ws: return
            t = ' '.join(ws)
            if verse is None:
                issues.append({'p': e['p'], 'vol': vol, 'msg': f'texto sin versículo en cap {chap}: {t[:50]}'}); return
            verse[1] = join(verse[1], t) if verse[1] else t
        w0 = words[0]
        rest = words
        digits0 = re.fullmatch(r'(\d{1,3})\.?', w0)
        numlike = bool(re.fullmatch(r"[0-9A-Za-z|!]{1,3}\.?", w0) and re.search(r'[0-9|!]', w0) or re.fullmatch(r'[SOlIZBGgb]{1,2}', w0))
        prev_end = verse is not None and re.search(r'[.:;?!»)]$', verse[1] or '') is not None
        if len(words) > 1 and matches_num(w0, exp):
            newverse(exp); rest = words[1:]
        elif len(words) > 1 and digits0 and int(digits0.group(1)) in (exp + 1, exp + 2) and (par or prev_end):
            newverse(int(digits0.group(1)), f'salto de versículo {chap}:{exp} -> {digits0.group(1)}'); rest = words[1:]
        elif par and len(words) > 1 and numlike:
            newverse(exp, f'marcador {chap}:{exp} leído «{w0}»'); rest = words[1:]
        elif par and prev_end and verse is not None:
            newverse(exp, f'marcador {chap}:{exp} ausente (párrafo «{w0[:14]}»)')
        # marcadores en mitad de línea (solo el siguiente exacto, tras puntuación)
        buf = []
        j = 0
        while j < len(rest):
            w = rest[j]
            if j > 0 and j + 1 < len(rest) and re.fullmatch(r'\d{1,3}', w) and int(w) == exp and re.search(r'[.:;?!»)]$', rest[j - 1]):
                push(buf); buf = []
                newverse(exp, None)
            else:
                buf.append(w)
            j += 1
        push(buf)
        state = 'verse'
    close_verse()
    json.dump({'vol': vol, 'books': books, 'issues': issues}, open(outp, 'w'), ensure_ascii=False)
    for b in books:
        print(b['osis'], b['score'], b['start'], len(b['chapters']), 'caps', sum(len(v) for v in b['chapters'].values()), 'vers', b['hdrs'])
    print(len(issues), 'avisos')
if __name__ == "__main__": main()
