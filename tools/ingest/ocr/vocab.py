"""Vocabulario de referencia: TA (NT), Scío, BLL, SBLM + diccionario es_ES (hunspell)."""
import gzip, json, re, os
P = '/home/void/BibliaCatolica/content/packs/'
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñæÆ]+(?:-[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*")
def words_of(code):
    d = json.load(gzip.open(P + f'bible.{code}.json.gz'))['books']
    for b in d.values():
        for vs in b.values():
            for _, t in vs:
                yield from WORD.findall(t)
def build():
    from collections import Counter
    c = Counter()
    for code in ('TA', 'SCIO', 'BLL', 'SBLM'):
        for w in words_of(code): c[w.lower()] += 1
    return c
_enchant = None
def es_ok(w):
    global _enchant
    if _enchant is None:
        import enchant
        _enchant = enchant.Dict('es_ES')
    try: return _enchant.check(w) or _enchant.check(w.capitalize())
    except Exception: return False
