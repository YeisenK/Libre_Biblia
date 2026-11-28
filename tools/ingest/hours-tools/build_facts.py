"""Genera tools/ingest/sources/hours/{psalter,short-readings,office-readings}.json a partir de las tablas de hechos
(distribución del salterio, lecturas breves y primeras lecturas del Oficio) consultadas en catholic-resources.org (Felix Just, SJ)
y contrastadas con la tabla de Laudes y Vísperas de la Liturgy Office de Inglaterra y Gales.
Entrada: carpeta con psalter.txt, short.json y or.json (volcado de texto de esas tablas; NO se redistribuye).
Uso: python3 -I build_facts.py <carpeta_entrada>
Las referencias se guardan con la numeración hebrea de los Salmos y versículos de la Liturgia (Biblia Grail/Jerusalén);
la app las convierte a la numeración de cada Biblia instalada."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from norm import norm
src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), '..', 'sources', 'hours')
DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

# ---------- Salterio ----------
lines = [l.strip().rstrip('|').strip().replace('\xa0',' ') for l in open(os.path.join(src,'psalter.txt'))]
lines = [l for l in lines if l]
weeks = {}
week = None
i = 0
KEYMAP = {'EP1':'vespers1','OR':'office','MP':'lauds','DP':'day','EP2':'vespers','EP':'vespers'}
while i < len(lines):
    l = lines[i]
    m = re.match(r'^WEEK (\d)$', l)
    if m: week = m.group(1); weeks.setdefault(week, {}); i += 1; continue
    m = re.match(r'^\*?(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday): (EP1|OR|MP|DP|EP2|EP)(?: \((1/2|3/4)\))?$', l)
    if m and week:
        d = str(DAYS.index(m.group(1))); key = KEYMAP[m.group(2)]
        if m.group(3) == '1/2': key = 'officeSeasonal'
        slots = []
        for raw in lines[i+1:i+4]:
            lent = None
            lm = re.search(r'\(Lent: ([^)]*)\)', raw)
            if lm: lent = norm(lm.group(1))
            refs = norm(raw)
            book = refs[0].split(' ')[0] if not refs[0][0].isdigit() else refs[0].split(' ')[1]
            slot = {'kind': 'psalm' if book == 'Ps' else 'canticle', 'refs': refs}
            if lent: slot['lentAlt'] = lent
            slots.append(slot)
        weeks[week].setdefault(d, {})[key] = slots
        i += 4; continue
    i += 1
# Oficio de lectura estacional vs ordinario: «(1/2)» es estacional; «(3/4)» ordinario.
i = 0; week = None
while i < len(lines):
    l = lines[i]
    m = re.match(r'^WEEK (\d)$', l)
    if m: week = m.group(1)
    m = re.match(r'^\*Saturday: OR \(3/4\)$|^\*Friday: OR \(3/4\)$', l)
    if m and week:
        d = '6' if 'Saturday' in l else '5'
        slots = [{'kind':'psalm','refs':norm(r)} for r in lines[i+1:i+4]]
        weeks[week][d]['office'] = slots
    i += 1
# Si el día solo tuvo (1/2)/(3/4) pero «office» procede de «(1/2)»: comprobado arriba (el (3/4) se asigna después).
night = {  # Completas: Hebrea; sábado = tras las I Vísperas del domingo
  '0a': {'psalms': [['Ps 4'], ['Ps 134']], 'reading': ['Deut 6,4-7'], 'note': 'tras las I Vísperas del domingo (noche del sábado)'},
  '0': {'psalms': [['Ps 91']], 'reading': ['Rev 22,4-5'], 'note': 'tras las II Vísperas del domingo'},
  '1': {'psalms': [['Ps 86']], 'reading': ['1 Thess 5,9-10']},
  '2': {'psalms': [['Ps 143,1-11']], 'reading': ['1 Pet 5,8-9']},
  '3': {'psalms': [['Ps 31,2-6'], ['Ps 130']], 'reading': ['Eph 4,26-27']},
  '4': {'psalms': [['Ps 16']], 'reading': ['1 Thess 5,23']},
  '5': {'psalms': [['Ps 88']], 'reading': ['Jer 14,9']},
}
night['6'] = night['0a']
json.dump({'numbering':'hebrew','invitatory':{'default':['Ps 95'],'alternatives':[['Ps 100'],['Ps 67'],['Ps 24']]},
  'weeks': weeks, 'compline': night,
  'complementary': {'terce':[['Ps 120'],['Ps 121'],['Ps 122']],'sext':[['Ps 123'],['Ps 124'],['Ps 125']],'none':[['Ps 126'],['Ps 127'],['Ps 128']]}},
  open(os.path.join(out,'psalter.json'),'w'), ensure_ascii=False, indent=1)

# ---------- Lecturas breves ----------
rows = json.load(open(os.path.join(src,'short.json')))
HOURS = {'MP':'lauds','DP-3':'terce','DP-6':'sext','DP-9':'none','EP':'vespers','EP I':'vespers1','EP II':'vespers2','EP I&II':'vespers12','Night':'compline','MP (alt)':'lauds'}
MONTH = {'Jan':'01','Feb':'02','March':'03','April':'04','May':'05','June':'06','July':'07','Aug':'08','Sept':'09','Oct':'10','Nov':'11','Dec':'12'}
DAYN = {'Sundays':0,'Mondays':1,'Tuesdays':2,'Wednesdays':3,'Thursdays':4,'Fridays':5,'Saturdays':6,'Sunday':0,'Monday':1,'Tuesday':2,'Wednesday':3,'Thursday':4,'Friday':5,'Saturday':6}
def keys_of(label):
    """Devuelve claves de selector para una etiqueta de la tabla."""
    L = label
    m = re.match(r'^Ordinary Time, Week (\d), (\w+)$', L)
    if m: return ['ord:%s:%d' % (m.group(1), DAYN[m.group(2)])]
    m = re.match(r'^Advent, (\w+) & Dec\. (\d+)(?: & Dec\. (\d+))?$', L)
    if m:
        k = ['advent:%d' % DAYN[m.group(1)]]
        return k
    m = re.match(r'^Lent, Weeks (\d)-(\d), (\w+)$', L)
    if m:
        d = DAYN[m.group(3)]
        return (['lent0:%d' % d] if m.group(1) == '0' else []) + ['lent:%d' % d]
    if L.startswith('Ash Wednesday'): return ['lent:3','date:ash']
    m = re.match(r'^Fifth Week of Lent & Holy Week, (\w+)$', L)
    if m: return ['lent5:%d' % DAYN[m.group(1)]]
    m = re.match(r'^Fifth Week of Lent, (\w+)$', L)
    if m: return ['lent5:%d' % DAYN[m.group(1)]]
    if L == 'Fifth Sunday of Lent' or L == 'Fifth Sunday of Lent & Palm Sunday': return ['lent5:0']
    if L == 'Palm Sunday': return ['palm']
    if L == 'Good Friday': return ['goodfriday']
    if L == 'Holy Thursday': return ['holythursday']
    if L == 'Holy Saturday': return ['holysaturday']
    m = re.match(r'^Easter, Weeks? (\d)(?:-(\d))?, (\w+)$', L)
    if m: return ['easter:%s:%d' % ((m.group(1)+'-'+m.group(2)) if m.group(2) else m.group(1), DAYN[m.group(3)])]
    m = re.match(r'^From Jan\. 2 to Epiphany: (\w+)$', L)
    if m: return ['jan2:%d' % DAYN[m.group(1)]]
    m = re.match(r'^After Epiphany to Baptism: (\w+)$', L)
    if m: return ['postepi:%d' % DAYN[m.group(1)]]
    if L.startswith('Holy Family'): return ['holy-family']
    if L == 'Baptism of the Lord': return ['baptism']
    if L == 'Epiphany': return ['epiphany']
    if L == 'Pentecost Sunday': return ['pentecost']
    if L == 'Ascension of the Lord': return ['ascension']
    if L.startswith('Common of') or L.startswith('Office for the Dead') or L.startswith('Memorial of the Blessed'):
        return ['common:' + re.sub(r'[^a-z]+', '-', L.lower()).strip('-')]
    m = re.match(r'^(\w+)s \(all\)$', L)
    if m: return ['night:%d' % DAYN[m.group(1)+'s']]
    if L.startswith('Sundays, after Evening Prayer I'): return ['night:6']
    if L.startswith('Sundays, after Evening Prayer II'): return ['night:0']
    if L == 'Second Sunday after Christmas': return ['dec:second-sunday']
    if L.startswith('Dec. 29 & Second Sunday'): return ['date:12-29','dec:second-sunday']
    if L.startswith('Advent'): return []
    m = re.match(r'^(Jan|Feb|March|April|May|June|July|Aug|Sept|Oct|Nov|Dec)\. ?(\d+)', L) or re.match(r'^(March|April|May|June|July) (\d+)', L)
    if m: return ['date:%s-%02d' % (MONTH[m.group(1)], int(m.group(2)))]
    return []
sr = {}
for ref, label, hr in rows:
    if hr not in HOURS: continue
    ks = keys_of(label)
    if not ks: continue
    # Adviento del 17 al 24 de diciembre: filas «Dec. N» comparten clave con el día de la semana
    for k in ks:
        sr.setdefault(k, {})
        h = HOURS[hr]
        refs = norm(ref)
        if h == 'vespers12': sr[k]['vespers1'] = refs; sr[k]['vespers2'] = refs
        else:
            if h in sr[k] and hr == 'MP (alt)': sr[k]['lauds-alt'] = refs
            else: sr[k][h] = refs
json.dump(sr, open(os.path.join(out,'short-readings.json'),'w'), ensure_ascii=False, indent=0, sort_keys=True)
print('lecturas breves: claves', len(sr))

# ---------- Primeras lecturas del Oficio ----------
rows = json.load(open(os.path.join(src,'or.json')))
orr = {}
ORD = {'1st':1,'2nd':2,'3rd':3}
def ordn(s): 
    m = re.match(r'(\d+)', s); return int(m.group(1))
for label, ref, _ in rows:
    k = None
    m = re.match(r'^(\d+)\w\w Week in Ord\. Time, (\w+)$', label)
    if m: k = 'ord:%d:%d' % (int(m.group(1)), DAYN[m.group(2)])
    m = m or re.match(r'^(\d+)\w\w Sunday in Ord\. Time$', label)
    if not k:
        m = re.match(r'^(\d+)\w\w Sunday in Ord\. Time$', label)
        if m: k = 'ord:%d:0' % int(m.group(1))
    if not k:
        m = re.match(r'^(\d+)\w\w Week of Advent: (\w+)$', label)
        if m: k = 'advent:%d:%d' % (int(m.group(1)), DAYN[m.group(2)])
        m = re.match(r'^(\d+)\w\w Sunday of Advent$', label)
        if m: k = 'advent:%d:0' % int(m.group(1))
        m = re.match(r'^Dec\. (\d+)$', label)
        if m: k = 'date:12-%02d' % int(m.group(1))
        if label == 'Dec. 25: Christmas': k = 'date:12-25'
        if label.startswith('Sunday in the Octave of Christmas'): k = 'holy-family'
        if label.startswith('Jan. 1:'): k = 'date:01-01'
        m = re.match(r'^From Jan\. 2 to Epiphany: (\w+)$', label)
        if m: k = 'jan2:%d' % DAYN[m.group(1)]
        m = re.match(r'^After Epiphany to the Baptism of the Lord: (\w+)$', label)
        if m: k = 'postepi:%d' % DAYN[m.group(1)]
        if 'Epiphany' in label and label.startswith('Jan. 6'): k = 'epiphany'
        if label.startswith('Sun. after Jan. 6') or label.startswith('Sun. after Jan'): k = 'baptism'
        if label == 'Ash Wednesday': k = 'lent:0:3'
        m = re.match(r'^(Thursday|Friday|Saturday) after Ash Wednesday$', label)
        if m: k = 'lent:0:%d' % DAYN[m.group(1)]
        m = re.match(r'^(\d+)\w\w Week of Lent, (\w+)$', label)
        if m: k = 'lent:%d:%d' % (int(m.group(1)), DAYN[m.group(2)])
        m = re.match(r'^(\d+)\w\w Sunday of Lent$', label)
        if m: k = 'lent:%d:0' % int(m.group(1))
        if label.startswith('Passion Sunday'): k = 'palm'
        m = re.match(r'^Holy Week, (\w+)$', label)
        if m: k = 'holyweek:%d' % DAYN[m.group(1)]
        if label == 'Holy Thursday': k = 'holythursday'
        if label == 'Good Friday': k = 'goodfriday'
        if label == 'Holy Saturday': k = 'holysaturday'
        m = re.match(r'^Easter Sunday, (\d)\w\w Reading', label)
        if m: k = 'easter-sunday:%s' % m.group(1)
        m = re.match(r'^(\w+) within the Octave of Easter$', label)
        if m: k = 'octave:%d' % DAYN[m.group(1)]
        m = re.match(r'^(\d+)\w\w Week of Easter, (\w+)$', label)
        if m: k = 'easter:%d:%d' % (int(m.group(1)), DAYN[m.group(2)])
        m = re.match(r'^(\d+)\w\w Sunday of Easter$', label)
        if m: k = 'easter:%d:0' % int(m.group(1))
        if label == 'Ascension': k = 'ascension'
        if label == 'Pentecost': k = 'pentecost'
        if label.startswith('Sunday after Pentecost: Trinity'): k = 'trinity'
        if label.startswith('Thursday after Trinity'): k = 'corpus-christi'
        if label.startswith('Friday after the 2nd Sunday after Pentecost'): k = 'sacred-heart'
        if label.startswith('Last Sunday in Ord'): k = 'christ-king'
        m = re.match(r'^(Nov|Dec|Jan|Feb|March|April|May|June|July|Aug|Sept|Oct)\. (\d+):', label)
        if m and not k: k = 'date:%s-%02d' % (MONTH[m.group(1)], int(m.group(2)))
    if not k: continue
    refs = norm(ref)
    if k.startswith('easter-sunday:'):
        orr.setdefault(k, refs); continue
    if k in orr: continue  # primera aparición (la tabla repite algunos días en dos volúmenes)
    orr[k] = refs
json.dump(orr, open(os.path.join(out,'office-readings.json'),'w'), ensure_ascii=False, indent=0, sort_keys=True)
print('lecturas del Oficio:', len(orr))
