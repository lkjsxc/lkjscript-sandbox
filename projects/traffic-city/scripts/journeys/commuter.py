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
rows=[20,48,76,104]
columns=[22,44,84,106]
corridors=[[(x,y) for x in columns] for y in rows]+[[(x,y) for y in rows] for x in columns]
# East-west services retain IDs 1..4; north-south services are IDs 5..8.
for index,stops in enumerate(corridors,1):
 commands=[('build-track',*stops[0],*stops[-1],0),('create-service',*stops[0],*stops[1],0)]
 commands += [('rail-stop',index,x+y*128,0,0,0) for x,y in stops[2:]]
 commands += [('rail-service',index,0,0,0,1)]
 bindings=[('c0',C(last))]
 for i,(op,x,y,x2,y2,k) in enumerate(commands):bindings.append(('c'+str(i+1),C('action',V('c'+str(i)),T(op),I(x),I(y),I(x2),I(y2),I(k))))
 name='rail-'+str(index);fn(name,[],'City',LET(bindings,V('c'+str(len(commands)))));last=name
fn('seats',[('lines','RailLines'),('id','I64')],'RailLines',IF(le(V('id'),I(len(corridors))),LET([('line',mget('I64 RailLine',V('lines'),V('id'),ZERO('RailLine')))],C('seats',mput('I64 RailLine',V('lines'),V('id'),PATCH('RailLine',V('line'),capacity=I(64))),add(V('id'),I(1)))),V('lines')))
# Scenario-only employment authoring, before any journey has begun. The four
# row bands are the authored east-west corridors, not a general routing rule.
# With no transfers, geometric nearest-job assignment can select an unreachable
# workplace in another row. Each row has exactly 512 people and 512 real jobs.
fn('job-rows',[('jobs','(list I64)'),('i','I64'),('out','Buckets')],'Buckets',IF(lt(V('i'),llen('I64',V('jobs'))),LET([
 ('job',at('I64',V('jobs'),V('i'))),('row',div(C('game::y',V('job')),I(28)))],
 C('job-rows',V('jobs'),add(V('i'),I(1)),mput('I64 (list I64)',V('out'),V('row'),append('I64',mget('I64 (list I64)',V('out'),V('row'),LS('I64')),V('job'))))),V('out')))
fn('staff',[('sim','Sim'),('rows','Buckets'),('i','I64'),('candidates','Numbers')],'Sim',IF(lt(V('i'),llen('I64',V('sim.ids'))),LET([
 ('id',at('I64',V('sim.ids'),V('i'))),('r',C('game::agent',V('sim.agents'),V('id'))),
 ('known',mget('I64 I64',V('candidates'),V('r.home'),I(-1))),
 ('sites',mget('I64 (list I64)',V('rows'),div(C('game::y',V('r.home')),I(28)),LS('I64'))),
 ('job',IF(AND(le(I(0),V('known')),lt(get(V('sim.employment'),V('known')),I(16))),V('known'),C('people::find-job-sites',V('sites'),V('sim.employment'),V('r.home'),I(0),I(-1))))],
 C('staff',PATCH('Sim',V('sim'),agents=mput('I64 Resident',V('sim.agents'),V('id'),PATCH('Resident',V('r'),job=V('job'))),employment=IF(le(I(0),V('job')),C('game::bump',V('sim.employment'),V('job'),I(1)),V('sim.employment'))),V('rows'),add(V('i'),I(1)),put(V('candidates'),V('r.home'),V('job')))),V('sim')))
fn('with-employment',[('city','City')],'City',PATCH('City',V('city'),sim=C('staff',PATCH('Sim',V('city.sim'),employment=MP()),C('job-rows',V('city.world.jobs'),I(0),MP('I64 (list I64)')),I(0),MP())))
fn('seed',[],'City',LET([('city',C('with-employment',C(last)))],PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=PATCH('Transit',V('city.sim.transit'),lines=C('seats',V('city.sim.transit.lines'),I(1)))))))
D.append(TEST('commuter-empty-layout',mlen('I64 I64',C('tiles',LS('ScenarioTile'),I(0),MP())),I(0)))
D.append(TEST('commuter-separate-job-corridors',mlen('I64 (list I64)',C('job-rows',LS('I64',I(2256),I(5840)),I(0),MP('I64 (list I64)'))),I(2)))
emit('commuter','commuter',D)
