import sys, json
from books import vulg_counts
d = json.load(open(sys.argv[1]))
for b in d['books']:
    vc = vulg_counts(b['osis']) if b['osis'] else {}
    ch = {int(c): vs for c, vs in b['chapters'].items()}
    bad = []
    for c in sorted(set(ch) | set(vc)):
        n = len(ch.get(c, [])); e = vc.get(c)
        if n != e: bad.append(f'{c}:{n}/{e}')
    print(b['osis'], b['start'], 'caps', len(ch), '/', len(vc), 'dif:', ' '.join(bad[:40]))
