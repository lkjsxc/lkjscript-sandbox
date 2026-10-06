"""Owned example cities. Python authors data; lkjscript builds and runs each city."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['ScenarioTile']={'id':'I64','kind':'I64'}
fn('tiles',[('items','(list ScenarioTile)'),('i','I64'),('out','Numbers')],'Numbers',IF(lt(V('i'),llen('ScenarioTile',V('items'))),LET([('tile',at('ScenarioTile',V('items'),V('i')))],C('tiles',V('items'),add(V('i'),I(1)),put(V('out'),V('tile.id'),V('tile.kind')))),V('out')))
for key,cash,level,permits in [('garden',5000,5,16),('crossing',2200,4,8),('metro',10000,5,8)]:
 raw=(ROOT/'examples'/f'{key}-layout.json').read_text()
 decoded=F(G('std::json-decode-or','(list ScenarioTile)',C('std::bytes-from-text',T(raw)),LS('ScenarioTile')),'value')
 base=LET([('city',C('town::from-tiles',C('tiles',decoded,I(0),MP()),I(cash)))],PATCH('City',V('city'),originX=I(50),originY=I(54),level=I(level),permits=I(permits)))
 fn(key+'-base',[],'City',base)
fn('action',[('city','City'),('op','Text'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64')],'City',F(C('town::command',V('city'),R(op=V('op'),x=V('x'),y=V('y'),x2=V('x2'),y2=V('y2'),kind=V('kind'))),'city'))
commands=[]
for line,ay,cy in [(1,61,58),(2,67,70)]:
 commands.extend([('build-track',59,ay,72,ay,0),('build-track',72,ay,79,cy,1)])
 commands.extend([('build-station',x,y,x,y,0) for x,y in [(59,ay),(72,ay),(79,cy)]])
 commands.extend([('create-service',59,ay,72,ay,0),('rail-stop',line,79+cy*128,0,0,0),('rail-service',line,0,0,0,1)])
b=[('c0',C('metro-base'))]
for i,(op,x,y,x2,y2,k) in enumerate(commands):b.append(('c'+str(i+1),C('action',V('c'+str(i)),T(op),I(x),I(y),I(x2),I(y2),I(k))))
fn('metro-seed',[],'City',LET(b,V('c'+str(len(commands)))))
fn('seed',[('id','I64')],'City',IF(eq(V('id'),I(1)),C('garden-base'),IF(eq(V('id'),I(2)),C('crossing-base'),C('metro-seed'))))
for i,key in enumerate(['garden','crossing','metro'],1):
 snapshot=ROOT/'examples'/f'{key}.json'
 body=F(G('std::json-decode-or','City',C('std::bytes-from-text',T(snapshot.read_text())),C('seed',I(i))),'value') if snapshot.exists() else C('seed',I(i))
 fn(key+'-saved',[],'City',body)
fn('load',[('id','I64')],'City',IF(eq(V('id'),I(1)),C('garden-saved'),IF(eq(V('id'),I(2)),C('crossing-saved'),C('metro-saved'))))
D.append('(component create factory (visibility private) (port create run (type (function (I64) City)) (function seed)))')
emit('scenarios','scenarios',D,tail=' (target create scenario-seed (component scenarios::factory) (runner command) (port scenarios::factory::run))')
