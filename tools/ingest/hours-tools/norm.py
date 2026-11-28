"""Normaliza referencias bíblicas de tablas de hechos del salterio (Hebrew numbering) a una lista de refs simples
parseables por `tryParseReference`. Uso interno de generación; los JSON resultantes viven en sources/hours/."""
import re
def norm(raw):
    raw = raw.replace('\xa0',' ').strip()
    raw = re.sub(r'\s*\([^)]*\)', '', raw)   # (I: Aleph), (Lent: ...)
    ONE = {'2 John': 13, '3 John': 14, 'Jude': 25, 'Obad': 21, 'Philem': 25}
    for b, n in ONE.items():
        if raw == b: raw = f'{b} 1:1-{n}'
        elif raw.startswith(b + ' ') and ':' not in raw: raw = f'{b} 1:' + raw[len(b)+1:]
    out = []
    book = None
    for seg in raw.split(';'):
        seg = seg.strip()
        if not seg: continue
        m = re.match(r'^((?:[123]\s)?[A-Za-z]+)\s+(\d.*)$', seg)
        if m:
            book, rest = m.group(1), m.group(2)
        else:
            rest = seg
        chapter = None
        for it in [x.strip() for x in rest.split(',')]:
            mm = re.match(r'^(?:(\d+):)?(\d+)[a-z]?(?:\s*[-—–]\s*(?:(\d+):)?(\d+)[a-z]?)?$', it)
            if not mm: raise ValueError(f'ref no entendida: {raw!r} / {it!r}')
            c1, v1, c2, v2 = mm.groups()
            if c1: chapter = c1
            elif chapter is None:
                # capítulo solo
                chapter = v1
                if v2: out.append(f'{book} {v1}-{v2}')  # no ocurre
                else: out.append(f'{book} {v1}')
                chapter = None; continue
            if v2:
                if c2: out.append(f'{book} {chapter},{v1}-{c2},{v2}')
                else: out.append(f'{book} {chapter},{v1}-{v2}')
            else: out.append(f'{book} {chapter},{v1}')
    # une versículos sueltos consecutivos del mismo capítulo: Ap 5,9 / 5,10 / 5,12 se dejan separados (fiel a la tabla)
    out = [o.replace(' Chron ', ' Chr ') for o in out]
    return out
if __name__=='__main__':
    for s in ['Ps 5:2-10, 12-13','Rev 4:11; 5:9, 10, 12','Isa 61:10—62:5','Ps 35:1-2, 3c, 9-12','Dan 3:57-88, 56','Ps 51','Rev 19:1-7 (Lent: 1 Pet 2:21-24)','Rev 1:4b-6, 10, 12-18; 2:26, 28; 3:5b, 12, 20-21','Isa 13:22b—14:1a','Dan 3:26, 27, 29, 34-41','1 Kings 18:16b-40']:
        print(s,'->',norm(s))
