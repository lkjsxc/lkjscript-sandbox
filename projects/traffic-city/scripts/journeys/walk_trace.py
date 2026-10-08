"""Native test-only single-resident trace. No HTTP or interactive endpoint."""
from native import *
TYPES['WalkFrame']={'tick':'I64','arrived':'I64','resident':'Resident'}
TYPES['WalkTraceInput']={'city':'City','ticks':'I64','resident':'I64'}
TYPES['WalkTrace']={'city':'City','frames':'(list WalkFrame)'}
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('advance',[('city','City'),('ticks','I64'),('id','I64'),('frames','(list WalkFrame)')],'WalkTrace',IF(lt(I(0),V('ticks')),LET([('next',C('traffic::tick',V('city')))],C('advance',V('next'),sub(V('ticks'),I(1)),V('id'),append('WalkFrame',V('frames'),R(tick=V('next.sim.tick'),arrived=V('next.sim.arrived'),resident=C('game::agent',V('next.sim.agents'),V('id')))))),R(city=V('city'),frames=V('frames'))))
fn('run',[('input','WalkTraceInput')],'WalkTrace',C('advance',V('input.city'),mn(I(256),mx(I(0),V('input.ticks'))),V('input.resident'),LS('WalkFrame')))
D.append('(component create probe (visibility private) (port create run (type (function (WalkTraceInput) WalkTrace)) (function run)))')
emit('walktrace','walktrace',D,tail=' (target create walk-trace (component walktrace::probe) (runner command) (port walktrace::probe::run))')
