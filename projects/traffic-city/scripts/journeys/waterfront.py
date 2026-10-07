"""Four native services and sixteen complete, walkable neighbourhoods."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['ScenarioTile']={'id':'I64','kind':'I64'}
fn('tiles',[('items','(list ScenarioTile)'),('i','I64'),('out','Numbers')],'Numbers',IF(lt(V('i'),llen('ScenarioTile',V('items'))),LET([('tile',at('ScenarioTile',V('items'),V('i')))],C('tiles',V('items'),add(V('i'),I(1)),put(V('out'),V('tile.id'),V('tile.kind')))),V('out')))
raw=(ROOT/'examples/waterfront-layout.json').read_text()
decoded=F(G('std::json-decode-or','(list ScenarioTile)',C('std::bytes-from-text',T(raw)),LS('ScenarioTile')),'value')
fn('base',[],'City',LET([('c',C('town::from-tiles',C('tiles',decoded,I(0),MP()),I(25000)))],PATCH('City',V('c'),originX=I(50),originY=I(54),landscape=I(1),level=I(6),permits=I(64))))
fn('action',[('city','City'),('op','Text'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'City',F(C('town::command',V('city'),R(op=V('op'),x=V('x'),y=V('y'),x2=V('x2'),y2=V('y2'),kind=V('kind'))),'city'))
last='base';services=[[(41,y) for y in [36,52,68,84]],[(89,y) for y in [36,52,68,84]],[(x,40) for x in [37,53,85,101]],[(x,78) for x in [37,53,85,101]]]
for index,stops in enumerate(services,1):
 (ax,ay),(bx,by)=stops[0],stops[-1]
 commands=[('build-track',ax,ay,bx,by,0)]
 commands+=[('create-service',*stops[0],*stops[1],0)]+[('rail-stop',index,x+y*128,0,0,0) for x,y in stops[2:]]+[('rail-service',index,0,0,0,1)]
 bindings=[('c0',C(last))]
 for i,(op,x,y,x2,y2,k) in enumerate(commands):bindings.append(('c'+str(i+1),C('action',V('c'+str(i)),T(op),I(x),I(y),I(x2),I(y2),I(k))))
 name='districts-'+str(index);fn(name,[],'City',LET(bindings,V('c'+str(len(commands)))));last=name
fn('seed',[],'City',C(last))
# Keep reference-interpreter unit cases structural. The actual 1,024-agent
# seed, running conservation and persistence are required integration workloads
# in tests/waterfront.mjs and tests/waterfront-ui.mjs, under the normal host policy.
TYPES['WaterfrontCapacity']={'residents':'I64','jobs':'I64','stations':'I64','tiles':'I64'}
fn('capacity',[('items','(list ScenarioTile)'),('i','I64'),('homes','I64'),('jobs','I64'),('stations','I64')],'WaterfrontCapacity',IF(lt(V('i'),llen('ScenarioTile',V('items'))),LET([('kind',F(at('ScenarioTile',V('items'),V('i')),'kind'))],C('capacity',V('items'),add(V('i'),I(1)),add(V('homes'),IF(eq(V('kind'),I(3)),I(1),I(0))),add(V('jobs'),IF(eq(V('kind'),I(4)),I(1),I(0))),add(V('stations'),IF(eq(V('kind'),I(8)),I(1),I(0))))),R(residents=mul(V('homes'),I(8)),jobs=mul(V('jobs'),I(16)),stations=V('stations'),tiles=llen('ScenarioTile',V('items')))))
D.append(TEST('waterfront-authored-capacity',C('capacity',decoded,I(0),I(0),I(0),I(0)),R(residents=I(1024),jobs=I(1024),stations=I(16),tiles=I(1318))))
D.append(TEST('waterfront-river-width',C('terrain::width',C('terrainfixtures::fixture')),I(6)))
emit('waterfront','waterfront',D)
