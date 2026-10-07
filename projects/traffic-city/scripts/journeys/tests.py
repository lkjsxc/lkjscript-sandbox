from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES.update({'Spec':{'id':'I64','kind':'I64','q':'I64'},'Workload':{'rows':'I64','ticks':'I64','tiles':'(list Spec)','commands':'(list Command)','after':'(list Command)'},'Result':{'city':'City','agents':'(list Resident)','lanes':'Numbers','reserved':'Numbers','busy':'Numbers','routes':'(list RoutePair)','conservation':'I64','largestQueue':'I64'}})
fn('fixture',[('specs','(list Spec)'),('index','I64'),('tiles','Numbers')],'City',IF(lt(V('index'),llen('Spec',V('specs'))),LET([('s',at('Spec',V('specs'),V('index')))],C('fixture',V('specs'),add(V('index'),I(1)),put(V('tiles'),V('s.id'),V('s.kind')))),C('town::from-tiles',V('tiles'),I(10000))))
fn('commands',[('city','City'),('commands','(list Command)'),('index','I64')],'City',IF(lt(V('index'),llen('Command',V('commands'))),C('commands',F(C('town::command',V('city'),at('Command',V('commands'),V('index'))),'city'),V('commands'),add(V('index'),I(1))),V('city')))
fn('rows',[('index','I64'),('total','I64'),('tiles','Numbers')],'Numbers',IF(lt(V('index'),V('total')),LET([('row',C('town::line',V('tiles'),I(0),V('index'),I(127),V('index'),I(2)))],C('rows',add(V('index'),I(1)),V('total'),IF(eq(mod(V('index'),I(2)),I(0)),put(put(V('row'),C('game::id',I(0),V('index')),I(3)),C('game::id',I(127),V('index')),I(4)),put(put(V('row'),C('game::id',I(32),V('index')),I(5)),C('game::id',I(64),V('index')),I(6))))),V('tiles')))
fn('resident-list',[('sim','Sim'),('index','I64'),('result','(list Resident)')],'(list Resident)',IF(lt(V('index'),llen('I64',V('sim.ids'))),C('resident-list',V('sim'),add(V('index'),I(1)),append('Resident',V('result'),C('game::agent',V('sim.agents'),at('I64',V('sim.ids'),V('index'))))),V('result')))
fn('outstanding',[('agents','(list Resident)'),('index','I64')],'I64',IF(lt(V('index'),llen('Resident',V('agents'))),LET([('r',at('Resident',V('agents'),V('index')))],add(IF(OR(eq(V('r.state'),I(1)),eq(V('r.state'),I(2)),eq(V('r.state'),I(4)),eq(V('r.state'),I(5)),eq(V('r.state'),I(6))),I(1),I(0)),C('outstanding',V('agents'),add(V('index'),I(1))))),I(0)))
fn('workload',[('input','Workload')],'Result',LET([('city',IF(eq(V('input.rows'),I(-1)),C('town::initial'),IF(lt(I(0),V('input.rows')),C('town::from-tiles',C('rows',I(0),mn(I(64),V('input.rows')),MP()),I(100000)),C('fixture',V('input.tiles'),I(0),MP())))),('result',C('commands',C('traffic::advance',C('commands',V('city'),V('input.commands'),I(0)),mx(I(0),mn(I(4000),V('input.ticks')))),V('input.after'),I(0))),('agents',C('resident-list',V('result.sim'),I(0),LS('Resident'))),('facts',C('people::facts',V('result.world'),V('result.sim.agents'),V('result.sim.ids'),I(0),ZERO('Facts')))],R(city=V('result'),agents=V('agents'),lanes=V('facts.occ'),reserved=V('facts.q'),busy=V('facts.busy'),routes=G('std::map-entries','I64 Route',V('result.sim.routes')),conservation=sub(sub(sub(V('result.sim.requested'),V('result.sim.arrived')),V('result.sim.cancelled')),C('outstanding',V('agents'),I(0))),largestQueue=I(0))))
# A full lane blocks upstream even when its downstream neighbour discharges later in the batch.
jamtiles=MP()
for id,kind in [(0,1),(1,1),(2,1),(3,4)]:jamtiles=put(jamtiles,I(id),I(kind))
jamagents=MP('I64 Resident')
for id,cell in [(1,0),(2,1),(3,1),(4,1),(5,2),(6,2),(7,2)]:
 resident=ZERO('Resident',id=I(id),home=I(0),job=I(3),dest=I(3),purpose=I(1),state=I(2),cell=I(cell),**{'from':I(cell),'to':I(cell)},step=I(cell),route=I(1),mode=I(2),duration=I(1),elapsed=I(1))
 jamagents=mput('I64 Resident',jamagents,I(id),resident)
jamroute=ZERO('Route',path=LS('I64',I(0),I(1),I(2),I(3)),cost=I(5),version=I(1),origin=I(0),dest=I(3),mode=I(2))
jam=LET([('world',C('game::world',jamtiles,MP(),I(1)))],C('traffic::city',V('world'),C('traffic::refresh',V('world'),ZERO('Sim',agents=jamagents,ids=LS('I64',*[I(i) for i in range(1,8)]),routes=mput('I64 Route',MP('I64 Route'),I(1),jamroute),nextId=I(8),nextRoute=I(2),requested=I(7),population=I(7),born=I(7))),I(10000),I(1),I(4),B(False),I(0)))
fn('jam',[],'City',jam)
D.append(TEST('full-lane-spills-back',F(C('game::agent',F(F(C('traffic::tick',C('jam')),'sim'),'agents'),I(1)),'cell'),I(0)))
D.append(TEST('spillback-explains-space',F(C('game::agent',F(F(C('traffic::tick',C('jam')),'sim'),'agents'),I(1)),'reason'),I(3)))
D.append(TEST('travelling-city-roundtrip',G('std::data-decode-or','City',G('std::data-encode','City',C('traffic::advance',C('town::initial'),I(24))),C('town::initial')),C('traffic::advance',C('town::initial'),I(24))))
D.append(TEST('typed-city-roundtrip',G('std::data-decode-or','City',G('std::data-encode','City',C('town::initial')),C('town::initial')),C('town::initial')))

exec((Path(__file__).parent/'rail_pair_checks.py').read_text())

# Development-only continuation target: resume exact synthetic/saved state without a host simulator.
TYPES['Continuation']={'city':'City','ticks':'I64','commands':'(list Command)','after':'(list Command)'}
fn('continue-city',[('input','Continuation')],'Result',LET([('result',C('commands',C('traffic::advance',C('commands',V('input.city'),V('input.commands'),I(0)),mx(I(0),mn(I(12000),V('input.ticks')))),V('input.after'),I(0))),('agents',C('resident-list',V('result.sim'),I(0),LS('Resident'))),('facts',C('people::facts',V('result.world'),V('result.sim.agents'),V('result.sim.ids'),I(0),ZERO('Facts')))],R(city=V('result'),agents=V('agents'),lanes=V('facts.occ'),reserved=V('facts.q'),busy=V('facts.busy'),routes=G('std::map-entries','I64 Route',V('result.sim.routes')),conservation=sub(sub(sub(V('result.sim.requested'),V('result.sim.arrived')),V('result.sim.cancelled')),C('outstanding',V('agents'),I(0))),largestQueue=I(0))))
D.append('(component create continuation (visibility private) (port create run (type (function (Continuation) Result)) (function continue-city)))')
D.append('(component create harness (visibility private) (port create run (type (function (Workload) Result)) (function workload)))')
# Keep every existing assertion, but give test observations their own requests.
# Larger modal planners must not exhaust one all-in-one authored witness budget.
import re
checks=[d for d in D if d.lstrip().startswith('(test create ')]
owners={re.search(r'\(function create ([^ ]+)',d)[1] for d in D if '(function create ' in d}
emit('tests','testbed',[d for d in D if d not in checks],tail=' (target create workload (component testbed::harness) (runner command) (port testbed::harness::run)) (target create continuation (component testbed::continuation) (runner command) (port testbed::continuation::run))')
for name,selected in [('simulationtests',[d for d in checks if '(test create rail-pair-' not in d]),('railpairtests',[d for d in checks if '(test create rail-pair-' in d])]:
 def qualify(m):
  n=m[1]
  return '(call '+('testbed::'+n if n in owners else n)
 emit(name,name,[re.sub(r'\(call ([a-z][a-z-]*)(?=[ )])',qualify,d) for d in selected])
