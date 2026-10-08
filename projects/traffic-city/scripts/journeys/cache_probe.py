"""Read-only native proof adapter for every packed edge slot and entry weight."""
from native import *
TYPES['EdgeSpec']={k:'I64' for k in ['id','direction','a','b','portal','endpoint','mode','queue']}
TYPES['EdgeProof']={'expected':'Bool','actual':'Bool','expectedCost':'I64','actualCost':'I64'}
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('prove',[('s','EdgeSpec')],'EdgeProof',LET([
 ('to',C('roads::neighbor',V('s.id'),V('s.direction'))),
 ('a',put(MP(),V('s.id'),V('s.a'))),
 ('b',IF(le(I(0),V('to')),put(V('a'),V('to'),V('s.b')),V('a'))),
 ('tiles',IF(AND(le(I(16384),V('s.id')),NOT(eq(V('s.direction'),I(4)))),put(V('b'),C('roads::ground',V('s.id')),V('s.portal')),V('b'))),
 ('origin',IF(eq(V('s.endpoint'),I(2)),V('to'),I(8000))),
 ('dest',IF(eq(V('s.endpoint'),I(1)),V('to'),I(8001))),
 ('code',C('roadcache::code',V('tiles'),V('s.id'))),
 ('mode',mod(IF(eq(V('s.mode'),I(1)),V('code'),div(V('code'),I(1024))),I(1024))),
 ('divisor',IF(eq(V('s.direction'),I(0)),I(1),IF(eq(V('s.direction'),I(1)),I(4),IF(eq(V('s.direction'),I(2)),I(16),IF(eq(V('s.direction'),I(3)),I(64),I(256)))))),
 ('slot',mod(div(V('mode'),V('divisor')),I(4))),
 ('world',ZERO('World',tiles=V('tiles'),junctions=IF(AND(le(I(0),V('to')),C('roads::junction',V('tiles'),V('to'))),put(MP(),V('to'),I(1)),MP()))),
 ('targetCode',IF(le(I(0),V('to')),C('roadcache::code',V('tiles'),V('to')),I(0))),
 ('meta',div(V('targetCode'),I(1048576)))],
 R(expected=C('roads::can-step',V('tiles'),V('s.id'),V('to'),V('origin'),V('dest'),V('s.mode')),
   actual=OR(eq(V('slot'),I(1)),AND(eq(V('slot'),I(2)),OR(eq(V('to'),V('origin')),eq(V('to'),V('dest'))))),
   expectedCost=IF(le(I(0),V('to')),C('game::edge-estimate-uncached',V('world'),put(MP(),V('to'),V('s.queue')),V('to'),V('s.mode')),I(0)),
   actualCost=IF(lt(V('to'),I(0)),I(0),IF(eq(V('s.mode'),I(1)),I(4),add(mod(V('meta'),I(16)),mn(I(8),div(V('s.queue'),div(V('meta'),I(16))))))))))
fn('batch',[('specs','(list EdgeSpec)'),('i','I64'),('out','(list EdgeProof)')],'(list EdgeProof)',
 IF(lt(V('i'),llen('EdgeSpec',V('specs'))),C('batch',V('specs'),add(V('i'),I(1)),append('EdgeProof',V('out'),C('prove',at('EdgeSpec',V('specs'),V('i'))))),V('out')))
fn('run',[('specs','(list EdgeSpec)')],'(list EdgeProof)',C('batch',V('specs'),I(0),LS('EdgeProof')))
D.append('(component create proof (visibility private) (port create run (type (function ((list EdgeSpec)) (list EdgeProof))) (function run)))')
emit('cacheprobe','cacheprobe',D,tail=' (target create cache-proof (component cacheprobe::proof) (runner command) (port cacheprobe::proof::run))')
