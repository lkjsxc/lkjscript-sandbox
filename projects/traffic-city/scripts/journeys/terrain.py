"""Versioned native terrain, bridge admission and complete-stroke pricing."""
from native import *
D=[]
def fn(n,p,r,b): D.append(FN(n,p,r,b))
def test(n,a,e): D.append(TEST(n,a,e))
# Half-tile arithmetic gives exact 45-degree bends. The browser receives this
# same centerline; it never invents buildable land or changes river occupancy.
fn('width',[('city','City')],'I64',IF(eq(V('city.landscape'),I(1)),I(6),I(2)))
t=V('t')
curve=IF(lt(t,I(-60)),I(16),IF(lt(t,I(-36)),add(I(16),add(t,I(60))),IF(lt(t,I(-16)),I(40),IF(lt(t,I(-6)),sub(I(40),add(t,I(16))),IF(lt(t,I(34)),I(30),IF(lt(t,I(54)),add(I(30),sub(t,I(34))),IF(lt(t,I(78)),I(50),IF(lt(t,I(96)),sub(I(50),sub(t,I(78))),I(32)))))))))
fn('center',[('city','City'),('y2','I64')],'I64',add(mul(V('city.originX'),I(2)),IF(eq(V('city.landscape'),I(1)),LET([('t',sub(V('y2'),mul(V('city.originY'),I(2))))],curve),I(30))))
fn('water',[('city','City'),('id','I64')],'Bool',LET([('a',C('center',V('city'),mul(C('game::y',V('id')),I(2)))),('b',C('center',V('city'),add(mul(C('game::y',V('id')),I(2)),I(2)))),('x',mul(C('game::x',V('id')),I(2))),('w',C('width',V('city')))],AND(le(I(0),V('id')),lt(V('id'),I(16384)),lt(V('x'),add(mx(V('a'),V('b')),V('w'))),lt(sub(mn(V('a'),V('b')),V('w')),add(V('x'),I(2))))))
# Packed half-tile X and integer Y, bounded to 129 vertices per topology frame.
fn('spine',[('city','City'),('y','I64'),('out','(list I64)')],'(list I64)',IF(le(V('y'),I(128)),C('spine',V('city'),add(V('y'),I(1)),append('I64',V('out'),add(C('center',V('city'),mul(V('y'),I(2))),mul(V('y'),I(512))))),V('out')))
fn('surface',[('kind','I64')],'Bool',OR(C('game::road',V('kind')),eq(V('kind'),I(7))))
fn('tile-price',[('city','City'),('id','I64'),('kind','I64')],'I64',IF(C('water',V('city'),V('id')),IF(eq(V('kind'),I(2)),I(72),IF(eq(V('kind'),I(1)),I(32),IF(C('roads::oneway',V('kind')),I(48),IF(eq(V('kind'),I(7)),I(16),C('game::price',V('kind')))))),C('game::price',V('kind'))))
fn('cost',[('city','City'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'I64',add(IF(eq(get(V('city.world.tiles'),C('game::id',V('x'),V('y'))),V('kind')),I(0),C('tile-price',V('city'),C('game::id',V('x'),V('y')),V('kind'))),IF(lt(V('x'),V('x2')),C('cost',V('city'),add(V('x'),I(1)),V('y'),V('x2'),V('y2'),V('kind')),IF(lt(V('y'),V('y2')),C('cost',V('city'),V('x'),add(V('y'),I(1)),V('x2'),V('y2'),V('kind')),I(0)))))
fn('new-water',[('city','City'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64')],'Bool',LET([('id',C('game::id',V('x'),V('y')))],OR(AND(C('water',V('city'),V('id')),NOT(C('surface',get(V('city.world.tiles'),V('id'))))),IF(lt(V('x'),V('x2')),C('new-water',V('city'),add(V('x'),I(1)),V('y'),V('x2'),V('y2')),IF(lt(V('y'),V('y2')),C('new-water',V('city'),V('x'),add(V('y'),I(1)),V('x2'),V('y2')),B(False))))))
fn('bridge-error',[('city','City'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'Text',IF(AND(C('surface',V('kind')),C('new-water',V('city'),V('x'),V('y'),V('x2'),V('y2')),OR(C('water',V('city'),C('game::id',V('x'),V('y'))),C('water',V('city'),C('game::id',V('x2'),V('y2'))))),T('A new bridge must reach dry land at both ends. Drag a complete bank-to-bank road or footpath.'),T('')))
fixture=ZERO('City',originX=I(50),originY=I(54),landscape=I(1))
fn('fixture',[],'City',fixture)
fixture=C('fixture')
for x,expected in [(61,False),(62,True),(64,True),(67,True),(68,False)]:test('broad-river-'+str(x),C('water',fixture,I(x+64*128)),B(expected))
for y,x in [(20,58),(36,70),(51,65),(71,65),(81,75),(93,75),(102,66)]:test('river-bend-'+str(y),C('center',fixture,I(2*y)),I(2*x))
test('static-spine-bounded',llen('I64',C('spine',fixture,I(0),LS('I64'))),I(129))
test('legacy-river-retains-footprint',C('width',ZERO('City')),I(2))
for kind,total in [(1,208),(2,480),(7,104),(9,312),(10,312),(11,312),(12,312)]:test('bridge-full-price-'+str(kind),C('cost',fixture,I(61),I(64),I(68),I(64),I(kind)),I(total))
test('bank-to-bank-accepted',C('bridge-error',fixture,I(61),I(64),I(68),I(64),I(1)),T(''))
test('partial-bridge-refused',C('bridge-error',fixture,I(61),I(64),I(65),I(64),I(7)),T('A new bridge must reach dry land at both ends. Drag a complete bank-to-bank road or footpath.'))

TYPES['TerrainProbe']={'landscape':'I64','originX':'I64','originY':'I64','row':'I64'}
TYPES['TerrainObservation']={'width':'I64','spine':'(list I64)','wet':'(list I64)'}
fn('wet-row',[('city','City'),('y','I64'),('x','I64'),('out','(list I64)')],'(list I64)',IF(lt(V('x'),I(128)),C('wet-row',V('city'),V('y'),add(V('x'),I(1)),IF(C('water',V('city'),C('game::id',V('x'),V('y'))),append('I64',V('out'),V('x')),V('out'))),V('out')))
fn('probe',[('p','TerrainProbe')],'TerrainObservation',LET([('city',ZERO('City',landscape=V('p.landscape'),originX=V('p.originX'),originY=V('p.originY')))],R(width=C('width',V('city')),spine=C('spine',V('city'),I(0),LS('I64')),wet=C('wet-row',V('city'),V('p.row'),I(0),LS('I64')))))
D.append('(component create observation (visibility private) (port create run (type (function (TerrainProbe) TerrainObservation)) (function probe)))')
# Split graph-authoring requests without raising the pinned compiler budgets.
import re
sets={'terrainfixtures':{'fixture'},'terrain':{'width','center','water','spine'},'terrainbuild':{'surface','tile-price','cost','new-water','bridge-error'},'terrainprobe':{'wet-row','probe'}}
owners={name:module for module,names in sets.items() for name in names}
for module in ['terrain','terrainbuild','terrainfixtures','terraintests','terrainprobe']:
 definitions=[]
 for d in D:
  match=re.search(r'\(function create ([^ ]+)',d)
  owner=owners.get(match[1]) if match else ('terrainprobe' if d.startswith('(component') else 'terraintests')
  if owner!=module:continue
  def qualify(m):
   n=m[1];o=owners.get(n)
   return '(call '+(o+'::'+n if o and o!=module else n)
  definitions.append(re.sub(r'\(call ([^ :()]+)(?=[ )])',qualify,d))
 tail=' (target create terrain-probe (component terrainprobe::observation) (runner command) (port terrainprobe::observation::run))' if module=='terrainprobe' else ''
 emit(module,module,definitions,tail=tail)
