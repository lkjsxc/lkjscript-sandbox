"""Exact typed predecessor readers. Existing coordinates and resident fields stay intact."""
from protocol import *
D=[]
TYPES['LegacySim']={k:v for k,v in TYPES['Sim'].items() if k not in ['cancelled','transit']}
TYPES['LegacyCity']={k:('LegacySim' if k=='sim' else v) for k,v in TYPES['City'].items() if k not in ['originX','originY','economy','landscape']}
TYPES['LegacySaved']={'format':'I64','owner':'Text','serial':'I64','city':'LegacyCity'}
TYPES['Legacy5Sim']={k:v for k,v in TYPES['Sim'].items() if k!='transit'}
TYPES['Legacy5City']={k:('Legacy5Sim' if k=='sim' else v) for k,v in TYPES['City'].items() if k not in ['economy','landscape']}
TYPES['Legacy5Saved']={'format':'I64','owner':'Text','serial':'I64','city':'Legacy5City'}
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('invalid',[],'Saved',R(format=I(-1),owner=T(''),serial=I(0),city=ZERO('City')))
# Seed only per-journey choice bookkeeping; historical transport totals are preserved.
fn('choices',[('agents','Residents'),('ids','(list I64)'),('index','I64'),('out','Numbers')],'Numbers',IF(lt(V('index'),llen('I64',V('ids'))),LET([('r',C('game::agent',V('agents'),at('I64',V('ids'),V('index'))))],C('choices',V('agents'),V('ids'),add(V('index'),I(1)),IF(AND(OR(eq(V('r.state'),I(1)),eq(V('r.state'),I(2)),eq(V('r.state'),I(4))),lt(I(0),V('r.mode'))),put(V('out'),V('r.id'),V('r.mode')),V('out')))),V('out')))
for version,typ in [(4,'LegacyCity'),(5,'Legacy5City')]:
 simtyp='LegacySim' if version==4 else 'Legacy5Sim'
 sim=R(**{k:V('old.sim.'+k) for k in TYPES[simtyp]},**({'cancelled':I(0)} if version==4 else {}),transit=ZERO('Transit',choices=C('choices',V('old.sim.agents'),V('old.sim.ids'),I(0),MP())))
 city=R(**{k:(sim if k=='sim' else V('old.'+k)) for k in TYPES[typ]},**({'originX':I(0),'originY':I(0)} if version==4 else {}))
 fn('city-v'+str(version),[('old',typ)],'City',LET([('migrated',city)],C('money::open',R(**{k:V('migrated.'+k) for k in TYPES['City'] if k not in ['economy','landscape']},economy=ZERO('Economy'),landscape=I(0)))))
legacy4=LET([('old',G('std::data-decode-or','LegacySaved',V('bytes'),ZERO('LegacySaved',format=I(-1))))],IF(eq(V('old.format'),I(4)),R(format=I(8),owner=V('old.owner'),serial=V('old.serial'),city=C('city-v4',V('old.city'))),C('invalid')))
fn('decode-v4',[('bytes','Bytes')],'Saved',legacy4)
legacy5=LET([('old5',G('std::data-decode-or','Legacy5Saved',V('bytes'),ZERO('Legacy5Saved',format=I(-1))))],IF(eq(V('old5.format'),I(5)),R(format=I(8),owner=V('old5.owner'),serial=V('old5.serial'),city=C('city-v5',V('old5.city'))),C('decode-v4',V('bytes'))))
fn('decode-v5',[('bytes','Bytes')],'Saved',legacy5)
exec((Path(__file__).parent/'migration_v6.py').read_text())
TYPES['Legacy7City']={k:v for k,v in TYPES['City'].items() if k!='landscape'}
TYPES['Legacy7Saved']={'format':'I64','owner':'Text','serial':'I64','city':'Legacy7City'}
fn('decode-v7',[('bytes','Bytes')],'Saved',LET([('old7',G('std::data-decode-or','Legacy7Saved',V('bytes'),ZERO('Legacy7Saved',format=I(-1))))],IF(eq(V('old7.format'),I(7)),R(format=I(8),owner=V('old7.owner'),serial=V('old7.serial'),city=R(**{k:V('old7.city.'+k) for k in TYPES['Legacy7City']},landscape=I(0))),C('decode-v6',V('bytes')))))
fn('decode',[('bytes','Bytes')],'Saved',LET([('current',G('std::data-decode-or','Saved',V('bytes'),C('invalid')))],IF(eq(V('current.format'),I(8)),V('current'),C('decode-v7',V('bytes')))))
legacy=ZERO('LegacySaved',format=I(4),owner=T('test-owner'),serial=I(17),city=ZERO('LegacyCity',cash=I(719),level=I(3),permits=I(5),paused=B(True),milestone=I(61),sim=ZERO('LegacySim',nextId=I(5033),requested=I(53),arrived=I(48))))
D.append(TEST('v4-explicit-cash-preserved',F(F(C('decode',G('std::data-encode','LegacySaved',legacy)),'city'),'cash'),I(719)))
D.append(TEST('v4-explicit-id-preserved',F(F(F(C('decode',G('std::data-encode','LegacySaved',legacy)),'city'),'sim'),'nextId'),I(5033)))
D.append(TEST('v4-coordinate-origin-preserved',F(F(C('decode',G('std::data-encode','LegacySaved',legacy)),'city'),'originX'),I(0)))
legacy5test=ZERO('Legacy5Saved',format=I(5),city=ZERO('Legacy5City',originX=I(50),originY=I(54),sim=ZERO('Legacy5Sim',cancelled=I(19))))
D.append(TEST('v5-cancelled-preserved',F(F(F(C('decode',G('std::data-encode','Legacy5Saved',legacy5test)),'city'),'sim'),'cancelled'),I(19)))
D.append(TEST('v5-centered-origin-preserved',F(F(C('decode',G('std::data-encode','Legacy5Saved',legacy5test)),'city'),'originX'),I(50)))
D.append(TEST('unknown-save-refused',F(C('decode',G('std::data-encode','LegacySaved',ZERO('LegacySaved',format=I(99)))),'format'),I(-1)))
# Keep version readers independently reviewable within normal proposal budgets.
import re
groups={'migration4':('migrate4',{'choices','city-v4','city-v5'}),'migration6':('migrate6',{'line-v6','lines-v6','transit-v6','city-v6'}),'migration':('migrate',{'invalid','decode-v4','decode-v5','decode-v6','decode-v7','decode'}),'migration-tests':('migratetests',{'v6-example','v6-train-example'})}
owners={name:module for _,(module,names) in groups.items() for name in names}
for file,(module,names) in groups.items():
 out=[]
 for declaration in D:
  match=re.search(r'\(function create ([^ ]+)',declaration)
  owner=owners.get(match.group(1)) if match else 'migratetests'
  if owner!=module:continue
  def qualify(m):
   n=m.group(1);o=owners.get(n)
   return '(call '+(o+'::'+n if o and o!=module else n)+' '
  out.append(re.sub(r'\(call ([^ :()]+) ',qualify,declaration))
 emit(file,module,out)
