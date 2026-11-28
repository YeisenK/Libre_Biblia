"""Datos canónicos para el ensamblado: orden de libros del AT/NT (Vulgata), capítulos y nombres tal como los rotula la edición."""
import gzip, json, re, unicodedata

VULG = json.load(gzip.open('/home/void/BibliaCatolica/content/packs/bible.VULG.json.gz'))['books']
ORDER = list(VULG.keys())  # orden de la Vulgata del paquete (Tob, Jdt antes de Esth...)

def vulg_counts(osis):
    return {int(c): len(vs) for c, vs in VULG[osis].items()}

# nombres con que la edición rotula el libro en la cabecera / portada (sin tildes, mayúsculas)
TITLES = {
 'Gen': ['GENESIS'], 'Exod': ['EXODO'], 'Lev': ['LEVITICO'], 'Num': ['LOS NUMEROS', 'NUMEROS'], 'Deut': ['DEUTERONOMIO'],
 'Josh': ['JOSUE'], 'Judg': ['LOS JUECES', 'JUECES'], 'Ruth': ['RUTH', 'RUT'],
 '1Sam': ['PRIMERO DE LOS REYES'], '2Sam': ['SEGUNDO DE LOS REYES'], '1Kgs': ['TERCERO DE LOS REYES'], '2Kgs': ['CUARTO DE LOS REYES'],
 '1Chr': ['PRIMERO DE LOS PARALIPOMENOS', 'PARALIPOMENOS'], '2Chr': ['SEGUNDO DE LOS PARALIPOMENOS'],
 'Ezra': ['PRIMERO DE ESDRAS', 'ESDRAS'], 'Neh': ['NEHEMIAS', 'SEGUNDO DE ESDRAS'], 'Tob': ['TOBIAS'], 'Jdt': ['JUDITH', 'JUDIT'],
 'Esth': ['ESTHER', 'ESTER'], 'Job': ['JOB'], 'Ps': ['SALMOS'], 'Prov': ['PROVERBIOS'], 'Eccl': ['ECCLESIASTES'], 'Song': ['CANTAR DE LOS CANTARES', 'CANTARES'],
 'Wis': ['SABIDURIA'], 'Sir': ['ECCLESIASTICO'], 'Isa': ['ISAIAS'], 'Jer': ['JEREMIAS'], 'Lam': ['LAMENTACIONES'], 'Bar': ['BARUCH', 'BARUC'],
 'Ezek': ['EZEQUIEL'], 'Dan': ['DANIEL'], 'Hos': ['OSEAS'], 'Joel': ['JOEL'], 'Amos': ['AMOS'], 'Obad': ['ABDIAS'], 'Jonah': ['JONAS'], 'Mic': ['MICHEAS'],
 'Nah': ['NAHUM'], 'Hab': ['HABACUC'], 'Zeph': ['SOFONIAS', 'SOPHONIAS'], 'Hag': ['AGGEO'], 'Zech': ['ZACARIAS'], 'Mal': ['MALACHIAS'],
 '1Macc': ['PRIMERO DE LOS MACHABEOS', 'MACHABEOS'], '2Macc': ['SEGUNDO DE LOS MACHABEOS'],
 '2Cor': ['SEGUNDA A LOS CORINTHIOS', 'CORINTHIOS'], 'Gal': ['GALATAS'], 'Eph': ['EFESIOS', 'EPHESIOS'], 'Phil': ['PHILIPENSES', 'FILIPENSES', 'PHILIPPENSES'],
 'Col': ['COLOSENSES'], '1Thess': ['PRIMERA A LOS THESALONICENSES', 'THESALONICENSES'], '2Thess': ['SEGUNDA A LOS THESALONICENSES'],
 '1Tim': ['PRIMERA A TIMOTHEO', 'TIMOTHEO'], '2Tim': ['SEGUNDA A TIMOTHEO'], 'Titus': ['TITO'], 'Phlm': ['PHILEMON', 'FILEMON'], 'Heb': ['HEBREOS'],
}
def strip(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
