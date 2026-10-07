"""Independent native timeline for test oracles; never calls the atlas sampler."""
from native import *
TYPES.update({'ProbeResident':{k:'I64' for k in 'id home state wait reason'.split()},'ProbeFrame':{'tick':'I64','residents':'(list ProbeResident)'},'ProbeResult':{'city':'City','frames':'(list ProbeFrame)'},'ProbeInput':{'city':'City','ticks':'I64'}})
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('residents',[('sim','Sim'),('index','I64'),('out','(list ProbeResident)')],'(list ProbeResident)',IF(lt(V('index'),llen('I64',V('sim.ids'))),LET([('r',C('game::agent',V('sim.agents'),at('I64',V('sim.ids'),V('index'))))],C('residents',V('sim'),add(V('index'),I(1)),append('ProbeResident',V('out'),R(**{k:V('r.'+k) for k in TYPES['ProbeResident']})))),V('out')))
fn('advance',[('city','City'),('remaining','I64'),('frames','(list ProbeFrame)')],'ProbeResult',IF(lt(I(0),V('remaining')),LET([('next',C('traffic::tick',V('city')))],C('advance',V('next'),sub(V('remaining'),I(1)),append('ProbeFrame',V('frames'),R(tick=V('next.sim.tick'),residents=C('residents',V('next.sim'),I(0),LS('ProbeResident')))))),R(city=V('city'),frames=V('frames'))))
fn('run',[('input','ProbeInput')],'ProbeResult',C('advance',PATCH('City',V('input.city'),paused=B(False)),mn(I(256),mx(I(0),V('input.ticks'))),LS('ProbeFrame')))
D.append('(component create probe (visibility private) (port create run (type (function (ProbeInput) ProbeResult)) (function run)))')
emit('atlasprobe','atlasprobe',D,tail=' (target create atlas-probe (component atlasprobe::probe) (runner command) (port atlasprobe::probe::run))')
