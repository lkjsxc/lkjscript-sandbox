"""Development-only authoring helpers. Output is ordinary, checked lkjscript proposals."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
def I(n): return f'(i64 {n})'
def B(n): return '(bool '+str(n).lower()+')'
def T(s): return '(text '+json.dumps(s,ensure_ascii=False)+')'
def V(s):
 parts=s.split('.');out=f'(local {parts[0]})'
 for p in parts[1:]:out=f'(field {out} (name {p}))'
 return out
def F(o,k):return f'(field {o} (name {k}))'
def C(n,*a):return '(call '+n+(' '+' '.join(a) if a else '')+')'
def G(n,types,*a):return '(call '+n+' (types '+types+')'+(' '+' '.join(a) if a else '')+')'
def IF(c,a,b):return '(if '+c+' '+a+' '+b+')'
def LET(bindings,body):return '(let '+' '.join('(binding '+k+' '+v+')' for k,v in bindings)+' (in '+body+'))'
def R(**fields):return '(record structural '+' '.join('(field '+k+' '+v+')' for k,v in fields.items())+')'
def LS(t,*a):return '(list '+t+(' '+' '.join(a) if a else '')+')'
def MP(t='I64 I64'):return '(map '+t+')'
def get(m,k):return C('game::get',m,k)
def put(m,k,v):return C('game::put',m,k,v)
def add(a,b):return C('std::add',a,b)
def sub(a,b):return C('std::subtract',a,b)
def mul(a,b):return C('std::multiply',a,b)
def div(a,b):return C('std::divide',a,b)
def mod(a,b):return C('game::mod',a,b)
def eq(a,b):return C('std::i64-equal',a,b)
def lt(a,b):return C('std::less',a,b)
def le(a,b):return C('std::less-equal',a,b)
def NOT(a):return C('std::bool-not',a)
def AND(*a):
 if len(a)==1:return a[0]
 return C('std::bool-and',a[0],AND(*a[1:]))
def OR(*a):
 if len(a)==1:return a[0]
 return C('std::bool-or',a[0],OR(*a[1:]))
def mn(a,b):return C('game::min',a,b)
def mx(a,b):return C('game::max',a,b)
def llen(t,l):return G('std::list-length',t,l)
def at(t,l,i):return G('std::list-get',t,l,i)
def append(t,l,x):return G('std::list-append',t,l,x)
def mget(t,m,k,f):return G('std::map-get-or',t,m,k,f)
def mput(t,m,k,x):return G('std::map-insert',t,m,k,x)
def mlen(t,m):return G('std::map-length',t,m)
TYPES={
'Numbers':'(map I64 I64)', 'Pair':{'key':'I64','value':'I64'},
'Route':{'path':'(list I64)','cost':'I64','version':'I64','origin':'I64','dest':'I64','mode':'I64'},
'Routes':'(map I64 Route)', 'RoutePair':{'key':'I64','value':'Route'},
'World':{'tiles':'Numbers','ids':'(list I64)','homes':'(list I64)','jobs':'(list I64)','shops':'(list I64)','parks':'(list I64)','junctions':'Numbers','signals':'Numbers','overview':'(list I64)','version':'I64'},
'Resident':{k:'I64' for k in 'id home job dest purpose cycle state cell from to step route mode prior dir lane slot elapsed duration wait ready departed etaWalk etaCar eta journeys lastTime reason exitKey zone mask'.split()},
'Residents':'(map I64 Resident)','ResidentPair':{'key':'I64','value':'Resident'},
'RailLine':{**{k:'I64' for k in 'id a b from to elapsed duration dwell status cost capacity rideTicks departures boardings spent'.split()},'enabled':'Bool','queueA':'(list I64)','queueB':'(list I64)','passengers':'(list I64)'},
'RailLines':'(map I64 RailLine)',
'RailPlan':{k:'I64' for k in 'line board alight accessRoute egressRoute stage eta'.split()},
'RailPlans':'(map I64 RailPlan)',
'Transit':{'lines':'RailLines','ids':'(list I64)','nextId':'I64','plans':'RailPlans','choices':'Numbers',**{k:'I64' for k in 'boardings completed spent'.split()}},
'RailSearch':{'plan':'Plan','choice':'RailPlan','complete':'Bool'},
'RailBatch':{'transit':'Transit','agents':'Residents','queue':'(list I64)','passengers':'(list I64)','count':'I64'},
'Sim':{'agents':'Residents','ids':'(list I64)','routes':'Routes','lookup':'Numbers','nextRoute':'I64','nextId':'I64','q':'Numbers','walkq':'Numbers','flow':'Numbers','inside':'Numbers','employment':'Numbers','transit':'Transit',**{k:'I64' for k in 'tick requested arrived visits workVisits shopVisits leisureVisits walkTrips carTrips waitTicks travelTicks totalDuration population waiting disconnected moving healthy born removed cancelled'.split()}},
'City':{'world':'World','sim':'Sim','cash':'I64','level':'I64','permits':'I64','paused':'Bool','milestone':'I64','originX':'I64','originY':'I64'},
'Command':{'op':'Text','x':'I64','y':'I64','x2':'I64','y2':'I64','kind':'I64'},
'Outcome':{'city':'City','notice':'Text'},
'EditQuote':{**{k:'I64' for k in 'id version x y x2 y2 tiles homes moveouts relocated cancelled refund rails layer'.split()},'valid':'Bool'},
'Removal':{'tiles':'Numbers','signals':'Numbers','selected':'Numbers','count':'I64','homes':'I64','refund':'I64','rails':'I64','railIds':'Numbers'},
'Relocation':{'agents':'Residents','ids':'(list I64)','moveouts':'I64','relocated':'I64','cancelled':'I64'},
'Buckets':'(map I64 (list I64))',
'Axis':{'columns':'Numbers','rows':'Numbers'},
'Search':{'hx':'Numbers','hy':'Numbers','buckets':'Buckets','dist':'Numbers','parent':'Numbers','pending':'I64'},
'CycleScan':{'done':'Numbers','members':'Numbers'},
'Facts':{'occ':'Numbers','heads':'Numbers','headReady':'Numbers','busy':'Numbers','q':'Numbers','walkq':'Numbers','inside':'Numbers','employment':'Numbers',**{k:'I64' for k in 'waiting disconnected moving'.split()}},
'Move':{'agents':'Residents','routes':'Routes','lookup':'Numbers','nextRoute':'I64','occ':'Numbers','busy':'Numbers','flow':'Numbers','inside':'Numbers','budget':'I64','cash':'I64','transit':'Transit',**{k:'I64' for k in 'requested arrived visits workVisits shopVisits leisureVisits walkTrips carTrips waitTicks travelTicks totalDuration income'.split()}},
'Plan':{'routes':'Routes','lookup':'Numbers','nextRoute':'I64','budget':'I64','id':'I64'},
}
# Format 7: explicit household/business accounts and reusable rail infrastructure.
TYPES['Economy']={'wallets':'Numbers','firms':'Numbers','active':'Bool',**{k:'I64' for k in 'opening grants exports salvage construction operating withdrawn households businesses wages sales taxes fares concessions upkeepDue periodTaxes periodFares periodOperating lastTaxes lastFares lastOperating'.split()}}
TYPES['City']['economy']='Economy'
# Format 8: preserve each city's authored terrain identity.
TYPES['City']['landscape']='I64'
TYPES['RailLine'].update({'path':'(list I64)','stops':'(list I64)','queues':'Buckets','direction':'I64'})
TYPES['Transit']['tracks']='Numbers'
TYPES['Removal']['tracks']='Numbers'
TYPES['RailPair']={k:'I64' for k in 'board alight estimate'.split()}
TYPES['TrackBuild']={'tiles':'Numbers','cost':'I64','valid':'Bool'}
def aliases(extra=None):
 out=[]
 for name,typ in (TYPES|dict(extra or {})).items():
  shape=typ if isinstance(typ,str) else '(record '+' '.join('('+k+' '+v+')' for k,v in typ.items())+')'
  out.append(' (type-alias '+name+' '+shape+')')
 return '\n'.join(out)
def PATCH(t,o,**changes):return R(**{k:changes.get(k,F(o,k)) for k in TYPES[t]})
def ZERO(t,**changes):
 def z(typ):
  if typ=='I64':return I(0)
  if typ=='Bool':return B(False)
  if typ=='Text':return T('')
  if typ.startswith('(list '):return LS(typ[6:-1])
  if typ.startswith('(map '):return MP(typ[5:-1])
  if isinstance(TYPES.get(typ),str):return z(TYPES[typ])
  return ZERO(typ)
 return R(**{k:changes.get(k,z(v)) for k,v in TYPES[t].items()})
def FN(name,params,result,body,private=False,effect='pure'):
 args=' '.join('(parameter create '+k+' (type '+v+'))' for k,v in params)
 return '  (function create '+name+' (visibility '+('private' if private else 'public')+') (effect '+effect+') '+args+' (returns '+result+')\n   (body '+body+'))\n'
def TEST(name,actual,expected):return '  (test create '+name+' (visibility private) (actual '+actual+') (expected '+expected+'))\n'
def emit(name,module,defs,extra=None,tail=''):
 (ROOT/'src'/f'{name}.lkjc').write_text('declarations.begin\n(units\n (use std builtin)\n'+aliases(extra)+'\n (module create '+module+'\n'+''.join(defs)+')\n'+tail+')\ndeclarations.end\n')
