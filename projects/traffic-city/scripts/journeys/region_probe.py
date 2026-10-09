"""Command-only large-city observer; never a game server or a partial save.

Return each resident's selected scalar fields once, not City plus duplicate
agents/routes. The ordinary complete City stays inside native execution.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
columns='id home job dest purpose state cell from to mode wait reason journeys route dir lane exitKey elapsed duration ready'.split()
TYPES['RegionRow']='(list I64)'
TYPES['RegionFrame']={k:'I64' for k in 'tick population born removed requested arrived cancelled active visits workVisits walking driving waiting disconnected boardings completed cash wealth expected'.split()}
TYPES['RegionRun']={'city':'City','frames':'(list RegionFrame)'}
TYPES['RegionResult']={'columns':'(list Text)','residents':'(list RegionRow)','frames':'(list RegionFrame)','tiles':'Numbers','rails':'RailLines','economy':'Economy','spine':'(list I64)','riverWidth':'I64','tracks':'Numbers','routeCount':'I64'}
fn('active',[('sim','Sim'),('i','I64'),('total','I64')],'I64',IF(lt(V('i'),llen('I64',V('sim.ids'))),LET([('r',C('game::agent',V('sim.agents'),at('I64',V('sim.ids'),V('i'))))],C('active',V('sim'),add(V('i'),I(1)),add(V('total'),IF(OR(eq(V('r.state'),I(1)),eq(V('r.state'),I(2)),eq(V('r.state'),I(4)),eq(V('r.state'),I(5)),eq(V('r.state'),I(6))),I(1),I(0))))),V('total')))
fn('frame',[('c','City')],'RegionFrame',LET([('s',V('c.sim')),('e',V('c.economy'))],R(**{k:V('s.'+k) for k in 'tick population born removed requested arrived cancelled visits workVisits waiting disconnected'.split()},active=C('active',V('s'),I(0),I(0)),walking=V('s.walkTrips'),driving=V('s.carTrips'),boardings=V('s.transit.boardings'),completed=V('s.transit.completed'),cash=V('c.cash'),wealth=add(add(V('c.cash'),V('e.households')),V('e.businesses')),expected=sub(add(add(add(V('e.opening'),V('e.grants')),V('e.exports')),V('e.salvage')),add(add(V('e.construction'),V('e.operating')),V('e.withdrawn'))))))
fn('advance',[('city','City'),('ticks','I64'),('frames','(list RegionFrame)'),('reference','Bool')],'RegionRun',IF(lt(I(0),V('ticks')),LET([('next',IF(V('reference'),C('moneyprobe::tick',V('city')),C('traffic::tick',V('city'))))],C('advance',V('next'),sub(V('ticks'),I(1)),append('RegionFrame',V('frames'),C('frame',V('next'))),V('reference'))),R(city=V('city'),frames=V('frames'))))
fn('rows',[('sim','Sim'),('i','I64'),('out','(list RegionRow)')],'(list RegionRow)',IF(lt(V('i'),llen('I64',V('sim.ids'))),LET([('r',C('game::agent',V('sim.agents'),at('I64',V('sim.ids'),V('i'))))],C('rows',V('sim'),add(V('i'),I(1)),append('RegionRow',V('out'),LS('I64',*[V('r.'+k) for k in columns])))),V('out')))
fn('observe',[('seed','City'),('ticks','I64'),('reference','Bool')],'RegionResult',LET([('result',C('advance',V('seed'),mn(I(256),mx(I(0),V('ticks'))),LS('RegionFrame',C('frame',V('seed'))),V('reference'))),('city',V('result.city'))],R(columns=LS('Text',*[T(k) for k in columns]),residents=C('rows',V('city.sim'),I(0),LS('RegionRow')),frames=V('result.frames'),tiles=V('city.world.tiles'),rails=V('city.sim.transit.lines'),economy=V('city.economy'),spine=C('terrain::spine',V('city'),I(0),LS('I64')),riverWidth=C('terrain::width',V('city')),tracks=V('city.sim.transit.tracks'),routeCount=mlen('I64 Route',V('city.sim.routes')))))
fn('run',[('ticks','I64')],'RegionResult',C('observe',C('region::seed'),V('ticks'),B(False)))
fn('reference',[('ticks','I64')],'RegionResult',C('observe',C('region::seed'),V('ticks'),B(True)))
fn('commuter',[('ticks','I64')],'RegionResult',C('observe',C('commuter::seed'),V('ticks'),B(False)))
D.append('(component create commuter-probe (visibility private) (port create run (type (function (I64) RegionResult)) (function commuter)))')
D.append('(component create reference-probe (visibility private) (port create run (type (function (I64) RegionResult)) (function reference)))')
D.append('(component create probe (visibility private) (port create run (type (function (I64) RegionResult)) (function run)))')
emit('regionprobe','regionprobe',D,tail=' (target create commuter-probe (component regionprobe::commuter-probe) (runner command) (port regionprobe::commuter-probe::run)) (target create region-probe (component regionprobe::probe) (runner command) (port regionprobe::probe::run)) (target create region-reference (component regionprobe::reference-probe) (runner command) (port regionprobe::reference-probe::run))')
