"""Test-only observer of complete native commuter-city ticks.

Compact train samples prove both rail axes run and share crossings safely.
The observer neither replaces the simulation nor alters any saved type.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['TrainSample']={**{k:'I64' for k in 'id from to elapsed duration departures boardings occupancy status direction waiting'.split()},'enabled':'Bool'}
TYPES['TrainFrame']={'tick':'I64','trains':'(list TrainSample)','requested':'I64','arrived':'I64','cancelled':'I64','active':'I64','wealth':'I64','expected':'I64'}
TYPES['TrainPath']={'id':'I64','path':'(list I64)','stops':'(list I64)'}
TYPES['TrainRun']={'city':'City','frames':'(list TrainFrame)'}
TYPES['TrainTrace']={'paths':'(list TrainPath)','frames':'(list TrainFrame)'}
fn('sample',[('l','RailLine')],'TrainSample',R(**{k:V('l.'+k) for k in 'id from to elapsed duration departures boardings status direction enabled'.split()},occupancy=llen('I64',V('l.passengers')),waiting=C('railpath::waiting',V('l'))))
fn('trains',[('t','Transit'),('i','I64'),('out','(list TrainSample)')],'(list TrainSample)',IF(lt(V('i'),llen('I64',V('t.ids'))),C('trains',V('t'),add(V('i'),I(1)),append('TrainSample',V('out'),C('sample',C('rail::line',V('t'),at('I64',V('t.ids'),V('i')))))),V('out')))
fn('paths',[('t','Transit'),('i','I64'),('out','(list TrainPath)')],'(list TrainPath)',IF(lt(V('i'),llen('I64',V('t.ids'))),LET([('l',C('rail::line',V('t'),at('I64',V('t.ids'),V('i'))))],C('paths',V('t'),add(V('i'),I(1)),append('TrainPath',V('out'),R(id=V('l.id'),path=C('railpath::path',V('l')),stops=C('railpath::stops',V('l')))))),V('out')))
fn('frame',[('city','City')],'TrainFrame',LET([('f',C('regionprobe::frame',V('city')))],R(**{k:V('f.'+k) for k in 'tick requested arrived cancelled active wealth expected'.split()},trains=C('trains',V('city.sim.transit'),I(0),LS('TrainSample')))))
fn('advance',[('city','City'),('ticks','I64'),('frames','(list TrainFrame)')],'TrainRun',IF(lt(I(0),V('ticks')),LET([('next',C('traffic::tick',V('city')))],C('advance',V('next'),sub(V('ticks'),I(1)),append('TrainFrame',V('frames'),C('frame',V('next'))))),R(city=V('city'),frames=V('frames'))))
fn('run',[('ticks','I64')],'TrainTrace',LET([('seed',C('commuter::seed')),('result',C('advance',V('seed'),mn(I(256),mx(I(0),V('ticks'))),LS('TrainFrame',C('frame',V('seed')))))],R(paths=C('paths',V('seed.sim.transit'),I(0),LS('TrainPath')),frames=V('result.frames'))))
D.append('(component create probe (visibility private) (port create run (type (function (I64) TrainTrace)) (function run)))')
emit('commuterrailprobe','commuterrailprobe',D,tail=' (target create commuter-rail-probe (component commuterrailprobe::probe) (runner command) (port commuterrailprobe::probe::run))')
