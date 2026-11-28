"""Escribe sources/hours/{hymns,collects,texts,preces}.json desde hymns_data.py y texts_data.py (texto editorial de Lux). Uso: python3 -I build_texts.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hymns_data, texts_data
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sources', 'hours')
w = lambda n, o: open(os.path.join(out, n), 'w').write(json.dumps(o, ensure_ascii=False, indent=1) + '\n')
w('hymns.json', hymns_data.H)
w('collects.json', {'collects': texts_data.C, 'byCelebration': texts_data.CELEBRATION_COLLECT})
w('texts.json', texts_data.T)
w('preces.json', texts_data.P)
print(len(hymns_data.H), 'himnos', len(texts_data.C), 'colectas', len(texts_data.P), 'series de invocaciones')
