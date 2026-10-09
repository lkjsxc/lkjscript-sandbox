"""A native 2,048-resident region; static layout is not a player save."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['ScenarioTile']={'id':'I64','kind':'I64'}
fn('tiles',[('items','(list ScenarioTile)'),('i','I64'),('out','Numbers')],'Numbers',IF(lt(V('i'),llen('ScenarioTile',V('items'))),LET([('tile',at('ScenarioTile',V('items'),V('i')))],C('tiles',V('items'),add(V('i'),I(1)),put(V('out'),V('tile.id'),V('tile.kind')))),V('out')))
raw=(ROOT/'examples/region-layout.json').read_text()
decoded=F(G('std::json-decode-or','(list ScenarioTile)',C('std::bytes-from-text',T(raw)),LS('ScenarioTile')),'value')
fn('base',[],'City',LET([('c',C('town::from-tiles',C('tiles',decoded,I(0),MP()),I(60000)))],PATCH('City',V('c'),originX=I(50),originY=I(54),landscape=I(1),level=I(7),permits=I(0))))
fn('action',[('city','City'),('op','Text'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'City',F(C('town::command',V('city'),R(op=V('op'),x=V('x'),y=V('y'),x2=V('x2'),y2=V('y2'),kind=V('kind'))),'city'))
last='base'
for index,y in enumerate([17,47,77,107],1):
 stops=[(x+1,y) for x in [8,22,36,49,85,98,111,122]]
 commands=[('build-track',*stops[0],*stops[-1],0),('create-service',*stops[0],*stops[1],0)]
 commands += [('rail-stop',index,x+y*128,0,0,0) for x,y in stops[2:]]
 commands += [('rail-service',index,0,0,0,1)]
 bindings=[('c0',C(last))]
 for i,(op,x,y,x2,y2,k) in enumerate(commands):bindings.append(('c'+str(i+1),C('action',V('c'+str(i)),T(op),I(x),I(y),I(x2),I(y2),I(k))))
 name='rail-'+str(index);fn(name,[],'City',LET(bindings,V('c'+str(len(commands)))));last=name
bindings=[('c0',C(last))]
for i,y in enumerate([27,87]):bindings.append(('c'+str(i+1),C('action',V('c'+str(i)),T('build-tunnel'),I(49),I(y),I(85),I(y),I(2))))
fn('seed',[],'City',LET(bindings,V('c2')))
# Large seeds run in integration tests, not the slow reference evaluator.
# Small contract witnesses still verify ordinary seed construction primitives.
D.append(TEST('region-empty-layout',mlen('I64 I64',C('tiles',LS('ScenarioTile'),I(0),MP())),I(0)))
D.append(TEST('region-layered-cell-range',C('game::id',I(127),I(127)),I(16383)))
emit('region','region',D)
