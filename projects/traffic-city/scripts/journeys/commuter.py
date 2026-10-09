"""An independent 2,048-resident commuter city; static layout is not a player save."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['ScenarioTile']={'id':'I64','kind':'I64'}
fn('tiles',[('items','(list ScenarioTile)'),('i','I64'),('out','Numbers')],'Numbers',IF(lt(V('i'),llen('ScenarioTile',V('items'))),LET([('tile',at('ScenarioTile',V('items'),V('i')))],C('tiles',V('items'),add(V('i'),I(1)),put(V('out'),V('tile.id'),V('tile.kind')))),V('out')))
raw=(ROOT/'examples/commuter-layout.json').read_text()
decoded=F(G('std::json-decode-or','(list ScenarioTile)',C('std::bytes-from-text',T(raw)),LS('ScenarioTile')),'value')
fn('base',[],'City',LET([('c',C('town::from-tiles',C('tiles',decoded,I(0),MP()),I(60000)))],PATCH('City',V('c'),originX=I(50),originY=I(54),level=I(7),permits=I(0))))
fn('action',[('city','City'),('op','Text'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'City',F(C('town::command',V('city'),R(op=V('op'),x=V('x'),y=V('y'),x2=V('x2'),y2=V('y2'),kind=V('kind'))),'city'))
last='base'
for index,y in enumerate([20,48,76,104],1):
 commands=[('build-track',22,y,106,y,0),('create-service',22,y,44,y,0)]
 commands += [('rail-stop',index,x+y*128,0,0,0) for x in [84,106]]
 commands += [('rail-service',index,0,0,0,1)]
 bindings=[('c0',C(last))]
 for i,(op,x,y,x2,y2,k) in enumerate(commands):bindings.append(('c'+str(i+1),C('action',V('c'+str(i)),T(op),I(x),I(y),I(x2),I(y2),I(k))))
 name='rail-'+str(index);fn(name,[],'City',LET(bindings,V('c'+str(len(commands)))));last=name
fn('seats',[('lines','RailLines'),('id','I64')],'RailLines',IF(le(V('id'),I(4)),LET([('line',mget('I64 RailLine',V('lines'),V('id'),ZERO('RailLine')))],C('seats',mput('I64 RailLine',V('lines'),V('id'),PATCH('RailLine',V('line'),capacity=I(64))),add(V('id'),I(1)))),V('lines')))
fn('seed',[],'City',LET([('city',C(last))],PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=PATCH('Transit',V('city.sim.transit'),lines=C('seats',V('city.sim.transit.lines'),I(1)))))))
D.append(TEST('commuter-empty-layout',mlen('I64 I64',C('tiles',LS('ScenarioTile'),I(0),MP())),I(0)))
emit('commuter','commuter',D)
