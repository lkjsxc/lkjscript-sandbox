"""Independent full-scan monetary reference, command-only verification targets."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['MoneyProbe']={'city':'City','ticks':'I64'}
fn('tick',[('city','City')],'City',LET([('movement',C('traffic::movement-tick',V('city')))],C('moneyflow::settle',V('city'),V('movement.city'))))
fn('advance',[('city','City'),('ticks','I64')],'City',IF(lt(I(0),V('ticks')),C('advance',C('tick',V('city')),sub(V('ticks'),I(1))),V('city')))
fn('reference',[('input','MoneyProbe')],'City',C('advance',V('input.city'),mn(I(512),mx(I(0),V('input.ticks')))))
fn('actual',[('input','MoneyProbe')],'City',C('traffic::advance',V('input.city'),mn(I(512),mx(I(0),V('input.ticks')))))
# Deliberate test-only omission proves that conservation alone is insufficient.
fn('missing-tick',[('city','City')],'City',LET([('movement',C('traffic::movement-tick',V('city')))],C('moneychanges::settle',V('city'),V('movement.city'),LS('I64'))))
fn('missing-advance',[('city','City'),('ticks','I64')],'City',IF(lt(I(0),V('ticks')),C('missing-advance',C('missing-tick',V('city')),sub(V('ticks'),I(1))),V('city')))
fn('missing',[('input','MoneyProbe')],'City',C('missing-advance',V('input.city'),mn(I(512),mx(I(0),V('input.ticks')))))
for name in ['reference','actual','missing']:D.append('(component create '+name+'-probe (visibility private) (port create run (type (function (MoneyProbe) City)) (function '+name+')))')
emit('moneyprobe','moneyprobe',D,tail=' (target create money-reference (component moneyprobe::reference-probe) (runner command) (port moneyprobe::reference-probe::run)) (target create money-actual (component moneyprobe::actual-probe) (runner command) (port moneyprobe::actual-probe::run)) (target create money-missing-arrivals (component moneyprobe::missing-probe) (runner command) (port moneyprobe::missing-probe::run))')
